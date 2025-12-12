/**
 * @interface BoxContext
 * Represents the context of an initialized isolate sandbox.
 */
export interface BoxContext {
  /** The numeric ID of the isolate box (derived from submission UUID). */
  boxId: number;

  /** * The absolute path to the sandbox directory on the host machine.
   * This is where we write source code, input files, etc.
   * Example: /var/local/lib/isolate/1/box
   */
  boxDir: string;

  /**
   * The root working directory of the isolate instance.
   * Example: /var/local/lib/isolate/1
   */
  workDir: string;
}
