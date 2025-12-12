import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';

import {
  CodeExecutionMode,
  ExecutionStatus,
  ProgrammingLanguage,
} from '@athena/types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunnerJobDataDto } from 'src/submission/dto/runner-job-data.dto';
import { SubmissionResultDto } from 'src/submission/dto/submission-result.dto';

import { LANGUAGES_CONFIG } from './config/languages.config';
import { BoxContext } from './interfaces/box-content.interface';
import { generateWrapper } from './templates/sql-wrapper.template';
import { ProcessExecutor } from './utils/process.executor';

@Injectable()
export class SandboxService implements OnModuleInit {
  private readonly logger = new Logger(SandboxService.name);

  private readonly STDOUT_FILE = 'stdout.txt';
  private readonly STDERR_FILE = 'stderr.txt';

  private readonly MAX_BOXES = 100;
  private availableBoxes: number[] = [];

  constructor(
    private readonly processExecutor: ProcessExecutor,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    for (let i = 0; i < this.MAX_BOXES; i++) {
      this.availableBoxes.push(i);
    }
    this.logger.log(`Sandbox Pool initialized with ${this.MAX_BOXES} boxes.`);
  }

  /**
   * Initializes a new isolate sandbox.
   * Corresponds to `isolate --init`.
   * @param submissionId The UUID of the submission.
   * @returns The context containing boxId and paths.
   */
  async initialize(submissionId: string): Promise<BoxContext> {
    const boxId = this.availableBoxes.pop();

    if (boxId === undefined) {
      throw new Error('No available sandbox boxes (Worker overloaded)');
    }
    const args = ['--init', `--box-id=${boxId}`, '--cg'];

    this.logger.debug(
      `Initializing box ${boxId} for submission ${submissionId}...`,
    );

    try {
      const result = await this.processExecutor.run('isolate', args);

      if (result.exitCode !== 0) {
        throw new Error(`Isolate init failed: ${result.stderr}`);
      }
      const workDir = result.stdout.trim();
      const boxDir = `${workDir}/box`;
      await this.processExecutor.run('chmod', ['-R', '777', boxDir]);
      return { boxId, boxDir, workDir };
    } catch (error) {
      this.logger.error(`Failed to initialize box ${boxId}`, error);
      await this.cleanup(boxId).catch(() => {});
      this.availableBoxes.push(boxId);
      throw error;
    }
  }

  /**
   * Orchestrates the entire code execution cycle.
   */
  async execute(jobData: RunnerJobDataDto): Promise<SubmissionResultDto> {
    let boxContext: BoxContext | null = null;

    try {
      boxContext = await this.initialize(jobData.submissionId);
      const sourceFileName = await this.setupFiles(boxContext, jobData);
      await this.run(boxContext, jobData, sourceFileName);
      const result = await this.verify(boxContext, jobData);
      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(`Execution failed for ${jobData.submissionId}`, error);
      return {
        submissionId: jobData.submissionId,
        status: ExecutionStatus.SystemError,
        message: error.message || 'Internal Runner Error',
      } as SubmissionResultDto;
    } finally {
      if (boxContext) {
        await this.cleanup(boxContext.boxId);
      }
    }
  }

  private getMetadataPath(boxId: number): string {
    return path.join(os.tmpdir(), `isolate_metadata_${boxId}.txt`);
  }

  /**
   * Cleans up the sandbox environment.
   * Corresponds to `isolate --cleanup`.
   * * @param boxId The numeric ID of the box to clean.
   */
  private async cleanup(boxId: number): Promise<void> {
    this.logger.debug(`Cleaning up box ${boxId}...`);
    const args = ['--cleanup', `--box-id=${boxId}`, '--cg'];

    try {
      await this.processExecutor.run('isolate', args);
    } catch (error) {
      this.logger.warn(`Cleanup failed for box ${boxId}`, error);
    } finally {
      if (!this.availableBoxes.includes(boxId)) {
        this.availableBoxes.push(boxId);
      }
    }
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
    let sourceCode = content.initialCode;

    if (langConfig.isWrapper) {
      this.logger.debug(`Generating SQL wrapper for box ${boxContext.boxId}`);
      sourceCode = generateWrapper(
        content.language,
        content.inputData,
        content.initialCode,
        content.testCasesCode,
      );
    }

    const sourceFileName = `source${langConfig.extension}`;
    const sourceFilePath = path.join(boxContext.boxDir, sourceFileName);

    await fs.writeFile(sourceFilePath, sourceCode, { encoding: 'utf8' });
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
    const metadataPath = this.getMetadataPath(boxContext.boxId);
    try {
      await fs.writeFile(metadataPath, '');
      await fs.chmod(metadataPath, 0o666);
    } catch (e) {
      this.logger.warn(`Failed to pre-create metadata file: ${e}`);
    }
    const args = [
      '--run',
      `--box-id=${boxContext.boxId}`,
      '--cg',
      `-M${metadataPath}`,
      `--stdout=${this.STDOUT_FILE}`,
      `--stderr=${this.STDERR_FILE}`,
    ];
    if (content.timeLimit) {
      args.push(`--time=${content.timeLimit}`);
      args.push(`--wall-time=${content.timeLimit * 2 + 1}`);
    }

    if (content.memoryLimit) {
      const memInKb = content.memoryLimit * 1024;
      args.push(`--cg-mem=${memInKb}`);
    }

    if (content.language === ProgrammingLanguage.SQL) {
      args.push('--share-net');
      const envArgs = this.getEnvArgs();
      args.push(...envArgs);
    }

    const commandToRun = langConfig.runCmd.replace(
      '{sourcePath}',
      sourceFileName,
    );

    const [executable, ...execArgs] = commandToRun.split(' ');
    args.push('--', executable, ...execArgs);

    this.logger.debug(
      `Running in box ${boxContext.boxId}: isolate ${args.join(' ')}`,
    );
    const result = await this.processExecutor.run('isolate', args);

    if (result.exitCode !== 0) {
      this.logger.warn(
        `Isolate exited with code ${result.exitCode} for box ${boxContext.boxId}. This might be a user error (RTE/TLE) or a system error. Verification will decide. Stderr: ${result.stderr}`,
      );
    }
  }

  /**
   * Generates --env arguments for `isolate` to inject database credentials.
   * Retrieves values from the main application config (process.env).
   */
  private getEnvArgs(): string[] {
    const dbHost = this.configService.get<string>(
      'RUNNER_DB_HOST',
      'localhost',
    );
    const dbUser = this.configService.get<string>('RUNNER_DB_USER', 'runner');
    const dbPass = this.configService.get<string>(
      'RUNNER_DB_PASSWORD',
      'runner',
    );
    const dbName = this.configService.get<string>(
      'RUNNER_DB_NAME',
      'runner_db',
    );
    const dbPort = this.configService.get<string>('RUNNER_DB_PORT', '5432');

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
    const stdout = await this.readFileSafely(
      path.join(boxContext.boxDir, this.STDOUT_FILE),
    );
    const stderr = await this.readFileSafely(
      path.join(boxContext.boxDir, this.STDERR_FILE),
    );
    const metadata = await this.parseMetadata(
      this.getMetadataPath(boxContext.boxId),
    );

    console.log('METADATA', metadata);

    if (Object.keys(metadata).length === 0 || metadata['status'] === 'XX') {
      return {
        submissionId: jobData.submissionId,
        status: ExecutionStatus.SystemError,
        message: 'Isolate failed to execute. No metadata produced.',
        stdout: stdout,
        stderr: stderr,
      };
    }
    const result: SubmissionResultDto = {
      submissionId: jobData.submissionId,
      status: ExecutionStatus.Processing,
      stdout: stdout,
      stderr: stderr,
      time: metadata['time'] ? parseFloat(metadata['time']) : 0,
      memory: metadata['cg-mem'] ? parseFloat(metadata['cg-mem']) : 0,
      message: metadata['message'],
    };
    if (metadata['status'] === 'TO') {
      result.status = ExecutionStatus.TimeLimitExceeded;
      return result;
    }

    if (metadata['status'] === 'XX') {
      result.status = ExecutionStatus.SystemError;
      return result;
    }

    if (metadata['status'] === 'SG') {
      const isOom =
        metadata['exitsig'] === '9' ||
        (result.message && result.message.includes('signal 9'));

      if (isOom) {
        result.status = ExecutionStatus.MemoryLimitExceeded;

        if (result.memory === 0 && content.memoryLimit) {
          result.memory = content.memoryLimit * 1024;
        }
      } else {
        result.status = ExecutionStatus.RuntimeError;
      }
      return result;
    }
    const exitCode = metadata['exitcode']
      ? parseInt(metadata['exitcode'], 10)
      : 0;

    if (exitCode !== 0) {
      result.status = ExecutionStatus.RuntimeError;
      if (stderr.includes('Test Failed') || stderr.includes('AssertionError')) {
        result.status = ExecutionStatus.WrongAnswer;
      }
      return result;
    }
    const langConfig = LANGUAGES_CONFIG[content.language];
    if (
      langConfig?.isWrapper ||
      content.executionMode === CodeExecutionMode.UnitTest
    ) {
      result.status = ExecutionStatus.Accepted;
      return result;
    }
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
