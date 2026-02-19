import { BlockContent, BlockRequiredAction, BlockType, SubmissionResult } from "@athena/types";

export enum AthenaEvent {
  ROLE_DELETED = "role.deleted",
  SUBMISSION_COMPLETED = "submission.completed",
  ENROLLMENT_CREATED = "enrollment.created",
  PROFILE_UPDATED = "profile.updated",
  LESSON_CREATED = "lesson.created",
  LESSON_UPDATED = "lesson.updated",
  LESSON_DELETED = "lesson.deleted",
  BLOCK_CREATED = "block.created",
  BLOCK_UPDATED = "block.updated",
  BLOCK_REORDERED = "block.reordered",
  BLOCK_DELETED = "block.deleted",
}

export interface SubmissionCompletedEvent {
  result: SubmissionResult;
}

export interface RoleDeletedEvent {
  name: string;
}

export interface EnrollmentCreatedEvent {
  id: string;
  userId: string;
  cohortId: string;
  courseId: string;
}

export class LessonCreatedEvent {
  constructor(
    public readonly lessonId: string,
    public readonly courseId: string,
    public readonly title: string,
    public readonly goals: string | null,
    public readonly order: number,
    public readonly isDraft: boolean,
  ) {}
}

export class LessonUpdatedEvent {
  constructor(
    public readonly lessonId: string,
    public readonly title: string,
    public readonly goals: string | null,
    public readonly order: number,
    public readonly isDraft: boolean,
  ) {}
}

export class LessonDeletedEvent {
  constructor(public readonly lessonId: string) {}
}

export class BlockCreatedEvent {
  constructor(
    public readonly blockId: string,
    public readonly lessonId: string,
    public readonly type: BlockType,
    public readonly content: BlockContent,
    public readonly orderIndex: number,
    public readonly requiredAction: BlockRequiredAction,
  ) {}
}

export class BlockUpdatedEvent {
  constructor(
    public readonly blockId: string,
    public readonly lessonId: string,
    public readonly type: BlockType,
    public readonly content: BlockContent,
    public readonly requiredAction: BlockRequiredAction,
  ) {}
}

export class BlockReorderedEvent {
  constructor(
    public readonly blockId: string,
    public readonly lessonId: string,
    public readonly orderIndex: number,
  ) {}
}

export class BlockDeletedEvent {
  constructor(
    public readonly blockId: string,
    public readonly lessonId: string,
  ) {}
}
