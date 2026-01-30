import { Command } from "@nestjs/cqrs";

/**
 * @class CompleteBlockSyncCommand
 * @description
 * Command to mark a synchronous learning block (Text, Video, Quiz) as completed.
 *
 * Characteristics:
 * - Synchronous: The result is applied immediately.
 * - Auto-score: Usually sets the score to 100 (for viewable content).
 *
 * Triggered by:
 * - HTTP Request (POST /view) from the Student App.
 */
export class CompleteBlockSyncCommand extends Command<void> {
  constructor(
    /**
     * The ID of the student performing the action.
     */
    public readonly userId: string,

    /**
     * The Course ID context.
     */
    public readonly courseId: string,

    /**
     * The Lesson ID context.
     */
    public readonly lessonId: string,

    /**
     * The specific Block ID being completed.
     */
    public readonly blockId: string,

    /**
     * The score achieved. Defaults to 100 for consumption-based blocks.
     */
    public readonly score: number = 100,
  ) {
    super();
  }
}
