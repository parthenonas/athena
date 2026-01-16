import { ProgressStatus } from "@athena/types";
import { AggregateRoot } from "@nestjs/cqrs";

import { ProgressInitializedEvent } from "./events/progress-initialized.event";
import { BlockResult } from "./value-objects/block-result.vo";

export interface StudentProgressProps {
  id: string;
  enrollmentId: string;
  courseId: string;
  studentId: string;
  status: ProgressStatus;
  currentScore: number;
  completedBlocks: Record<string, BlockResult>;
  createdAt: Date;
  updatedAt: Date;
}

export class StudentProgress extends AggregateRoot {
  private readonly _id: string;
  private readonly _enrollmentId: string;
  private readonly _courseId: string;
  private readonly _studentId: string;
  private _status: ProgressStatus;
  private _currentScore: number;
  private _completedBlocks: Record<string, BlockResult>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: StudentProgressProps) {
    super();
    this._id = props.id;
    this._enrollmentId = props.enrollmentId;
    this._courseId = props.courseId;
    this._studentId = props.studentId;
    this._status = props.status;
    this._currentScore = props.currentScore;
    this._completedBlocks = props.completedBlocks;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(id: string, enrollmentId: string, courseId: string, studentId: string): StudentProgress {
    const instance = new StudentProgress({
      id,
      enrollmentId,
      courseId,
      studentId,
      status: ProgressStatus.NOT_STARTED,
      currentScore: 0,
      completedBlocks: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    instance.apply(new ProgressInitializedEvent(id, studentId, courseId, enrollmentId));

    return instance;
  }

  public startCourse(): void {
    if (this._status === ProgressStatus.NOT_STARTED) {
      this._status = ProgressStatus.IN_PROGRESS;
      this.updateTimestamp();
    }
  }

  public completeBlock(blockId: string, score: number): void {
    const result = new BlockResult(score, new Date());
    this._completedBlocks[blockId] = result;

    this.recalculateScore();
    this.updateTimestamp();
  }

  private recalculateScore(): void {
    this._currentScore = Object.values(this._completedBlocks).reduce((sum, b) => sum + b.score, 0);
  }

  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  get id() {
    return this._id;
  }
  get enrollmentId() {
    return this._enrollmentId;
  }
  get courseId() {
    return this._courseId;
  }
  get studentId() {
    return this._studentId;
  }
  get status() {
    return this._status;
  }
  get currentScore() {
    return this._currentScore;
  }
  get completedBlocks() {
    return this._completedBlocks;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }
}
