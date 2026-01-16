import { MigrationInterface, QueryRunner } from "typeorm";

export class CourseIdToCohort1768468636452 implements MigrationInterface {
  name = "CourseIdToCohort1768468636452";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cohorts" ADD "course_id" uuid NOT NULL`);
    await queryRunner.query(`ALTER TABLE "cohorts" ALTER COLUMN "instructor_id" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cohorts" ALTER COLUMN "instructor_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "cohorts" DROP COLUMN "course_id"`);
  }
}
