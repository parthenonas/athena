import { ProgrammingLanguage } from '@athena/types';

/**
 * Interface defining how a specific programming language should be handled
 * within the sandbox environment.
 */
export interface LanguageConfig {
  /** The file extension for the source code (e.g., '.py', '.js', '.cpp'). */
  extension: string;

  /**
   * The command to compile the code.
   * If null, the language is interpreted (no compilation needed).
   * Example: 'g++ -O3 {sourcePath} -o {binaryPath}'
   */
  compileCmd: string | null;

  /**
   * The command to run the executable or interpret the source.
   * Placeholders like {sourcePath} or {binaryPath} will be replaced at runtime.
   * Example: '/usr/bin/python3 {sourcePath}'
   */
  runCmd: string;

  /**
   * Indicates whether this language requires a wrapper script for execution.
   * If true, the runner will use a wrapper script to execute the code.
   */
  isWrapper?: boolean;
}

/**
 * Registry mapping ProgrammingLanguage enums to their execution configurations.
 * This acts as a strategy pattern for the runner.
 */
export const LANGUAGES_CONFIG: Record<ProgrammingLanguage, LanguageConfig> = {
  [ProgrammingLanguage.Python]: {
    extension: '.py',
    compileCmd: null,
    runCmd: '/usr/bin/python3 {sourcePath}',
  },
  // SQL runs via Python
  [ProgrammingLanguage.SQL]: {
    extension: '.py',
    compileCmd: null,
    runCmd: '/usr/bin/python3 {sourcePath}',
    isWrapper: true,
  },
};
