import { MigrationInterface, QueryRunner } from "typeorm";

export class StudentProgress1768601114630 implements MigrationInterface {
  name = "StudentProgress1768601114630";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."student_progress_status_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "enrollmentId" uuid NOT NULL, "courseId" uuid NOT NULL, "studentId" uuid NOT NULL, "status" "public"."student_progress_status_enum" NOT NULL DEFAULT 'NOT_STARTED', "currentScore" integer NOT NULL DEFAULT '0', "totalBlocksCompleted" integer NOT NULL DEFAULT '0', "completedBlocks" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7a183101e5247d972e9da748377" UNIQUE ("enrollmentId", "courseId"), CONSTRAINT "PK_e7df7ebbbab37cc250594423a38" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_progress"`);
    await queryRunner.query(`DROP TYPE "public"."student_progress_status_enum"`);
  }
}
