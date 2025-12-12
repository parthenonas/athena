import * as fs from 'fs/promises';
import path from 'path';

import {
  CodeExecutionMode,
  ExecutionStatus,
  ProgrammingLanguage,
} from '@athena/types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RunnerJobDataDto } from 'src/submission/dto/runner-job-data.dto';
import { SubmissionResultDto } from 'src/submission/dto/submission-result.dto';

import { LANGUAGES_CONFIG } from './config/languages.config';
import { BoxContext } from './interfaces/box-content.interface';
import { generateWrapper } from './templates/sql-wrapper.template';
import { ProcessExecutor } from './utils/process.executor';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  private readonly STDOUT_FILE = 'stdout.txt';
  private readonly STDERR_FILE = 'stderr.txt';
  private readonly METADATA_FILE = 'metadata.txt';

  constructor(
    private readonly processExecutor: ProcessExecutor,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initializes a new isolate sandbox.
   * Corresponds to `isolate --init`.
   * @param submissionId The UUID of the submission.
   * @returns The context containing boxId and paths.
   */
  async initialize(submissionId: string): Promise<BoxContext> {
    const boxId = this.getBoxIdFromUuid(submissionId);

    // --cg: Enable control groups (required for limits)
    // --box-id: Specify our calculated ID
    // --init: Initialize the box
    const args = ['--init', `--box-id=${boxId}`, '--cg'];

    this.logger.debug(
      `Initializing box ${boxId} for submission ${submissionId}...`,
    );

    try {
      // 1. Run isolate --init
      // The output (stdout) contains the path to the box root directory.
      const result = await this.processExecutor.run('isolate', args);

      if (result.exitCode !== 0) {
        throw new Error(`Isolate init failed: ${result.stderr}`);
      }

      // Isolate returns the path with a newline, trim it.
      // Example output: /var/local/lib/isolate/123
      const workDir = result.stdout.trim();
      const boxDir = `${workDir}/box`;

      // 2. Fix Permissions (Judge0 logic)
      // Isolate creates directories owned by root. The Node.js process (runner)
      // needs write access to write source files.
      // We assume the runner has sudo privileges or is running as root in Docker.
      // 'chmod 777' is used here for simplicity within the container environment.
      await this.processExecutor.run('chmod', ['-R', '777', workDir]);

      return { boxId, boxDir, workDir };
    } catch (error) {
      this.logger.error(`Failed to initialize box ${boxId}`, error);
      // Try to cleanup immediately if init partially failed
      await this.cleanup(boxId).catch(() => {});
      throw error;
    }
  }

  /**
   * Orchestrates the entire code execution cycle.
   */
  async execute(jobData: RunnerJobDataDto): Promise<SubmissionResultDto> {
    let boxContext: BoxContext | null = null;

    try {
      // 1. Initialize Sandbox
      boxContext = await this.initialize(jobData.submissionId);

      // 2. Setup Files (Source, Input, Wrappers)
      const sourceFileName = await this.setupFiles(boxContext, jobData);

      // 3. Run Code (Isolate)
      await this.run(boxContext, jobData, sourceFileName);

      // 4. Verify & Get Result
      const result = await this.verify(boxContext, jobData);

      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(`Execution failed for ${jobData.submissionId}`, error);

      // Return a system error result if something crashed in the runner itself
      return {
        submissionId: jobData.submissionId,
        status: ExecutionStatus.SystemError,
        message: error.message || 'Internal Runner Error',
      } as SubmissionResultDto;
    } finally {
      // 5. Cleanup (Always!)
      if (boxContext) {
        await this.cleanup(boxContext.boxId);
      }
    }
  }

  /**
   * Cleans up the sandbox environment.
   * Corresponds to `isolate --cleanup`.
   * * @param boxId The numeric ID of the box to clean.
   */
  async cleanup(boxId: number): Promise<void> {
    this.logger.debug(`Cleaning up box ${boxId}...`);

    // --cleanup: Remove the box directory
    const args = ['--cleanup', `--box-id=${boxId}`, '--cg'];

    try {
      await this.processExecutor.run('isolate', args);
    } catch (error) {
      // We verify cleanup but don't throw, as the execution result
      // is already determined by this point.
      this.logger.warn(`Cleanup failed for box ${boxId}`, error);
    }
  }

  /**
   * Converts a UUID string into a numeric ID (0 - 2147483647).
   * Used because isolate requires integer IDs.
   */
  private getBoxIdFromUuid(uuid: string): number {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash) % 2147483647;
  }

  /**
   * Prepares the sandbox by writing source code and input files.
   * Handles wrapper generation for SQL.
   * * @param boxContext The initialized box context.
   * @param jobData The job payload.
   * @returns The relative filename of the source code inside the box (e.g., 'source.py').
   */
  private async setupFiles(
    boxContext: BoxContext,
    jobData: RunnerJobDataDto,
  ): Promise<string> {
    const { content } = jobData;
    const langConfig = LANGUAGES_CONFIG[content.language];

    if (!langConfig) {
      throw new Error(`Unsupported language: ${content.language}`);
    }

    // 1. Prepare Source Code Content
    let sourceCode = content.initialCode;

    // SQL Strategy: Generate Wrapper
    if (langConfig.isWrapper) {
      this.logger.debug(`Generating SQL wrapper for box ${boxContext.boxId}`);
      sourceCode = generateWrapper(
        content.language,
        content.inputData,
        content.initialCode,
        content.testCasesCode,
      );
    }

    // 2. Write Source File
    // Example: /var/lib/isolate/0/box/source.py
    const sourceFileName = `source${langConfig.extension}`;
    const sourceFilePath = path.join(boxContext.boxDir, sourceFileName);

    await fs.writeFile(sourceFilePath, sourceCode, { encoding: 'utf8' });

    // 3. Write Stdin File (stdin.txt)
    // For standard languages, we write content.inputData to stdin.
    // For wrapper languages (SQL), inputData is already embedded in the wrapper,
    // so we write an empty stdin or specific inputs if needed by the wrapper logic.
    const stdinPath = path.join(boxContext.boxDir, 'stdin.txt');

    let stdinContent = '';
    if (!langConfig.isWrapper && content.inputData) {
      stdinContent = content.inputData;
    }

    await fs.writeFile(stdinPath, stdinContent, { encoding: 'utf8' });

    return sourceFileName;
  }

  /**
   * Executes the code within the initialized sandbox.
   * Constructs the `isolate` command with all limits and environment variables.
   *
   * @param boxContext The initialized box context.
   * @param jobData The job payload containing limits.
   * @param sourceFileName The name of the executable source file inside the box.
   */
  private async run(
    boxContext: BoxContext,
    jobData: RunnerJobDataDto,
    sourceFileName: string,
  ): Promise<void> {
    const { content } = jobData;
    const langConfig = LANGUAGES_CONFIG[content.language];

    // 1. Prepare Paths (files live inside the boxDir on host)
    // We don't write to them, isolate does. We just tell isolate where they are.
    // Note: Isolate command arguments for redirection expect relative paths inside the box usually,
    // OR mapped paths. But usually, we let the program output to stdout/stderr,
    // and tell isolate to redirect its stdout/stderr to files.
    // However, looking at Judge0 and `isolate --help`, typical usage is:
    // isolate --run --stdout=stdout.txt --stderr=stderr.txt ...
    // These files will be created INSIDE the box directory.

    // 2. Base Arguments
    const args = [
      '--run',
      `--box-id=${boxContext.boxId}`,
      '--cg', // Use Control Groups for accurate metrics
      `-M${this.METADATA_FILE}`, // Write metadata to this file (relative to box root)
      `--stdout=${this.STDOUT_FILE}`,
      `--stderr=${this.STDERR_FILE}`,
    ];

    // 3. Apply Resource Limits
    // Time Limit (CPU)
    if (content.timeLimit) {
      args.push(`--time=${content.timeLimit}`);
      // Wall time is usually slightly higher to account for startup
      args.push(`--wall-time=${content.timeLimit * 2 + 1}`);
    }

    // Memory Limit
    if (content.memoryLimit) {
      // Isolate expects memory in KB. DTO usually has MB.
      const memInKb = content.memoryLimit * 1024;
      args.push(`--cg-mem=${memInKb}`);
    }

    // 4. Networking & Environment
    // SQL requires network access to reach the Postgres Sidecar
    if (content.language === ProgrammingLanguage.SQL) {
      args.push('--share-net');

      // Inject DB Credentials into the sandbox environment
      const envArgs = this.getEnvArgs();
      args.push(...envArgs);
    }

    // 5. Construct the actual command to run inside the box
    // Replace {sourcePath} with the filename relative to the box root.
    // Example: "/usr/bin/python3 source.py"
    const commandToRun = langConfig.runCmd.replace(
      '{sourcePath}',
      sourceFileName,
    );

    // Split command into executable and args (e.g., ['/usr/bin/python3', 'source.py'])
    // This is a naive split; complex commands might need better parsing,
    // but for our config it's sufficient.
    const [executable, ...execArgs] = commandToRun.split(' ');

    // Add "--" separator before the command
    args.push('--', executable, ...execArgs);

    this.logger.debug(
      `Running in box ${boxContext.boxId}: isolate ${args.join(' ')}`,
    );

    // 6. Execute!
    // We verify the exit code of ISOLATE itself, not the user program.
    // If isolate crashes (exit code != 0), it's a SystemError.
    // If user program crashes, isolate returns 0 but writes the exit code to metadata.
    const result = await this.processExecutor.run('isolate', args);

    if (result.exitCode !== 0) {
      throw new Error(
        `Isolate execution failed (System Error): ${result.stderr}`,
      );
    }
  }

  /**
   * Generates --env arguments for `isolate` to inject database credentials.
   * Retrieves values from the main application config (process.env).
   */
  private getEnvArgs(): string[] {
    const dbHost = this.configService.get<string>('DB_HOST', 'localhost');
    const dbUser = this.configService.get<string>('DB_USER', 'postgres');
    const dbPass = this.configService.get<string>('DB_PASSWORD', 'postgres');
    const dbName = this.configService.get<string>('DB_NAME', 'postgres');
    const dbPort = this.configService.get<string>('DB_PORT', '5432');

    return [
      `--env=DB_HOST=${dbHost}`,
      `--env=DB_USER=${dbUser}`,
      `--env=DB_PASSWORD=${dbPass}`,
      `--env=DB_NAME=${dbName}`,
      `--env=DB_PORT=${dbPort}`,
    ];
  }

  /**
   * Reads artifacts (stdout, stderr, metadata) and determines the final verdict.
   *
   * @param boxContext The box context.
   * @param jobData The original job payload (needed for expected output).
   * @returns The fully populated SubmissionResultDto.
   */
  private async verify(
    boxContext: BoxContext,
    jobData: RunnerJobDataDto,
  ): Promise<SubmissionResultDto> {
    const { content } = jobData;

    // 1. Read Artifacts
    const stdout = await this.readFileSafely(
      path.join(boxContext.boxDir, this.STDOUT_FILE),
    );
    const stderr = await this.readFileSafely(
      path.join(boxContext.boxDir, this.STDERR_FILE),
    );
    const metadata = await this.parseMetadata(
      path.join(boxContext.boxDir, this.METADATA_FILE),
    );

    // 2. Default Result (Populate metrics)
    const result: SubmissionResultDto = {
      submissionId: jobData.submissionId,
      status: ExecutionStatus.Processing,
      stdout: stdout,
      stderr: stderr,
      time: metadata['time'] ? parseFloat(metadata['time']) : 0,
      memory: metadata['cg-mem'] ? parseFloat(metadata['cg-mem']) : 0, // KB
      message: metadata['message'], // System message from isolate (e.g., "killed by signal")
    };

    // 3. Determine Status based on Metadata flags (System/Environment level)
    if (metadata['status'] === 'TO') {
      result.status = ExecutionStatus.TimeLimitExceeded;
      return result;
    }

    if (metadata['status'] === 'XX') {
      result.status = ExecutionStatus.SystemError;
      return result;
    }

    if (metadata['status'] === 'SG') {
      // SG = Died on signal (Segfault, etc.)
      result.status = ExecutionStatus.RuntimeError;
      return result;
    }

    // 4. Determine Status based on Exit Code (Application level)
    const exitCode = metadata['exitcode']
      ? parseInt(metadata['exitcode'], 10)
      : 0;

    if (exitCode !== 0) {
      // Non-zero exit code usually means Runtime Error or Compilation Error (if we compiled).
      // For interpreted languages, syntax error is also a runtime error here.
      result.status = ExecutionStatus.RuntimeError;

      // Specifc check for SQL/Wrapper assertions
      if (stderr.includes('Test Failed') || stderr.includes('AssertionError')) {
        // If our wrapper threw an assertion error, it's effectively a Wrong Answer
        result.status = ExecutionStatus.WrongAnswer;
      }
      return result;
    }

    // 5. Logic Verification (If exit code is 0)
    // Scenario A: Wrapper / Unit Test Mode
    // If it's a wrapper (SQL) or Unit Test, and exitCode is 0, it means all assertions passed.
    const langConfig = LANGUAGES_CONFIG[content.language];
    if (
      langConfig?.isWrapper ||
      content.executionMode === CodeExecutionMode.UnitTest
    ) {
      result.status = ExecutionStatus.Accepted;
      return result;
    }

    // Scenario B: IO Check (Standard stdout comparison)
    // Compare actual stdout with expected output.
    if (content.outputData) {
      const actual = this.normalizeOutput(stdout);
      const expected = this.normalizeOutput(content.outputData);

      if (actual === expected) {
        result.status = ExecutionStatus.Accepted;
      } else {
        result.status = ExecutionStatus.WrongAnswer;
      }
      return result;
    }

    // Fallback: If no checks required and exited with 0
    result.status = ExecutionStatus.Accepted;
    return result;
  }

  /**
   * Helper to safely read a file. Returns empty string if file doesn't exist.
   */
  private async readFileSafely(filepath: string): Promise<string> {
    try {
      return await fs.readFile(filepath, 'utf8');
    } catch {
      return '';
    }
  }

  /**
   * Parses isolate's key:value metadata file.
   */
  private async parseMetadata(
    filepath: string,
  ): Promise<Record<string, string>> {
    const raw = await this.readFileSafely(filepath);
    const result: Record<string, string> = {};

    raw.split('\n').forEach((line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });

    return result;
  }

  /**
   * Normalizes output for comparison:
   * - Trims trailing spaces on each line.
   * - Removes carriage returns (\r).
   * - Trims leading/trailing whitespace of the whole text.
   */
  private normalizeOutput(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  }
}
