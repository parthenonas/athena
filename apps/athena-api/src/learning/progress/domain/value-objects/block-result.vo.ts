import { BaseBlockResult, GradingStatus } from "@athena/types";

export class BlockResult implements BaseBlockResult {
  constructor(
    public readonly score: number,
    public readonly completedAt: Date,
    public readonly status: GradingStatus = GradingStatus.GRADED,
    public readonly submissionData?: unknown,
    public readonly feedback?: string,
  ) {
    if (score < 0) {
      throw new Error("Score cannot be negative");
    }
  }

  equals(other: BlockResult): boolean {
    if (!other) return false;

    const otherTime =
      other.completedAt instanceof Date ? other.completedAt.getTime() : new Date(other.completedAt).getTime();

    const thisTime =
      this.completedAt instanceof Date ? this.completedAt.getTime() : new Date(this.completedAt).getTime();

    return (
      this.score === other.score &&
      this.status === other.status &&
      thisTime === otherTime &&
      JSON.stringify(this.submissionData) === JSON.stringify(other.submissionData)
    );
  }
}
