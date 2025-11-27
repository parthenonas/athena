import { MigrationInterface, QueryRunner } from "typeorm";

export class CourseLessonsBlocks1764282468826 implements MigrationInterface {
  name = "CourseLessonsBlocks1764282468826";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lesson_id" uuid NOT NULL, "parent_block_id" uuid, "prev_block_id" uuid, "next_block_id" uuid, "type" character varying NOT NULL, "data" jsonb NOT NULL, "rawText" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "blocks__id__pk" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "author_id" character varying NOT NULL, "tags" text array NOT NULL DEFAULT array[]::text[], "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "courses__id__pk" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lessons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "course_id" uuid NOT NULL, "title" character varying NOT NULL, "goals" text, "order" integer NOT NULL, "is_draft" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "lessons__id__pk" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "blocks__lesson_id__fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "blocks__parent_block_id__fk" FOREIGN KEY ("parent_block_id") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "blocks__prev_block_id__fk" FOREIGN KEY ("prev_block_id") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "blocks__next_block_id__fk" FOREIGN KEY ("next_block_id") REFERENCES "blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD CONSTRAINT "lessons__course_id__fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT "lessons__course_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__next_block_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__prev_block_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__parent_block_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__lesson_id__fk"`);
    await queryRunner.query(`DROP TABLE "lessons"`);
    await queryRunner.query(`DROP TABLE "courses"`);
    await queryRunner.query(`DROP TABLE "blocks"`);
  }
}
