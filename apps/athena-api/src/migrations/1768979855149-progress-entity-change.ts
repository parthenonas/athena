import { MigrationInterface, QueryRunner } from "typeorm";

export class ProgressEntityChange1768979855149 implements MigrationInterface {
  name = "ProgressEntityChange1768979855149";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student_progress" DROP COLUMN "totalBlocksCompleted"`);
    await queryRunner.query(`ALTER TABLE "student_progress" DROP COLUMN "completedBlocks"`);
    await queryRunner.query(`ALTER TABLE "student_progress" ADD "lessons" jsonb NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student_progress" DROP COLUMN "lessons"`);
    await queryRunner.query(`ALTER TABLE "student_progress" ADD "completedBlocks" jsonb NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "student_progress" ADD "totalBlocksCompleted" integer NOT NULL DEFAULT '0'`);
  }
}
