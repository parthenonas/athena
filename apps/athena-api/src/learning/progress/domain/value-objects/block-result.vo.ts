export class BlockResult {
  constructor(
    public readonly score: number,
    public readonly completedAt: Date,
  ) {
    if (score < 0) {
      throw new Error("Score cannot be negative");
    }
  }

  equals(other: BlockResult): boolean {
    return this.score === other.score && this.completedAt.getTime() === other.completedAt.getTime();
  }
}
