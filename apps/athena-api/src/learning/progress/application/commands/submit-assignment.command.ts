import { Command } from "@nestjs/cqrs";

import { StudentSubmissionDto } from "../dto/student-submission.dto";

/**
 * @class SubmitAssignmentCommand
 * @description
 * Command to handle a student's attempt to solve an asynchronous task (Code Challenge).
 *
 * Characteristics:
 * - State Change: Sets the block status to PENDING immediately.
 * - Workflow: Triggers an event that starts the Saga for code execution.
 *
 * Triggered by:
 * - HTTP Request (POST /submit) from the Student App.
 */
export class SubmitAssignmentCommand extends Command<void> {
  constructor(
    /**
     * The ID of the student submitting the code.
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
     * The specific Block ID being submitted.
     */
    public readonly blockId: string,

    /**
     * The payload containing code, language, and metadata.
     */
    public readonly payload: StudentSubmissionDto,
  ) {
    super();
  }
}
