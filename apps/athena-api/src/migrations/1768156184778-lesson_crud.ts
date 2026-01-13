import { MigrationInterface, QueryRunner } from "typeorm";

export class LessonCrud1768156184778 implements MigrationInterface {
  name = "LessonCrud1768156184778";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "cohort_id" uuid NOT NULL, 
        "account_id" uuid NOT NULL, 
        "status" character varying NOT NULL DEFAULT 'active', 
        "enrolled_at" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "enrollments__cohort_account__uk" UNIQUE ("cohort_id", "account_id"), 
        CONSTRAINT "enrollments__id__pk" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "enrollments__account_id__idx" ON "enrollments" ("account_id")`);

    await queryRunner.query(
      `CREATE TABLE "instructors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "account_id" uuid NOT NULL, 
        "bio" text, 
        "title" character varying, 
        "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "instructors__account_id__uk" UNIQUE ("account_id"), 
        CONSTRAINT "instructors__id__pk" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "cohorts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "name" character varying NOT NULL, 
        "instructor_id" uuid, 
        "start_date" TIMESTAMP, 
        "end_date" TIMESTAMP, 
        "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "cohorts__id__pk" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "cohort_id" uuid NOT NULL, 
        "lesson_id" uuid NOT NULL, 
        "start_at" TIMESTAMP, 
        "end_at" TIMESTAMP, 
        "is_open_manually" boolean NOT NULL DEFAULT false, 
        "config_overrides" jsonb NOT NULL DEFAULT '{}', 
        "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "schedules__cohort_lesson__uk" UNIQUE ("cohort_id", "lesson_id"), 
        CONSTRAINT "schedules__id__pk" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "enrollments" 
       ADD CONSTRAINT "enrollments__cohort_id__fk" 
       FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") 
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "cohorts" 
       ADD CONSTRAINT "cohorts__instructor_id__fk" 
       FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id") 
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "schedules" 
       ADD CONSTRAINT "schedules__cohort_id__fk" 
       FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") 
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT "schedules__cohort_id__fk"`);
    await queryRunner.query(`ALTER TABLE "cohorts" DROP CONSTRAINT "cohorts__instructor_id__fk"`);
    await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments__cohort_id__fk"`);

    await queryRunner.query(`DROP TABLE "schedules"`);
    await queryRunner.query(`DROP TABLE "cohorts"`);
    await queryRunner.query(`DROP TABLE "instructors"`);

    await queryRunner.query(`DROP INDEX "enrollments__account_id__idx"`);
    await queryRunner.query(`DROP TABLE "enrollments"`);
  }
}
