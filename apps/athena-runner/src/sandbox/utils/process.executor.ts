import { Injectable, Logger } from '@nestjs/common';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { ProcessResult } from '../interfaces/process-result.interface';

@Injectable()
export class ProcessExecutor {
  private readonly logger = new Logger(ProcessExecutor.name);

  /**
   * Executes a command in the shell and returns the result.
   * @param command The command to run (e.g., 'isolate').
   * @param args The arguments for the command (e.g., ['--init', '-b', '1']).
   * @param options Spawn options (cwd, env, etc.).
   * @returns A Promise that resolves with the ProcessResult containing stdout, stderr, and exitCode.
   */
  // eslint-disable-next-line
  async run(command: string, args: string[], options: SpawnOptionsWithoutStdio = {}): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: string) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: string) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? -1,
        });
      });

      child.on('error', (err: Error) => {
        this.logger.error(`Failed to start subprocess: ${command}`, err);
        reject(err);
      });
    });
  }
}
