import { MigrationInterface, QueryRunner } from "typeorm";

export class BlockEntityRefactor1764842478640 implements MigrationInterface {
  name = "BlockEntityRefactor1764842478640";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__parent_block_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__prev_block_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__next_block_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__lesson_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "parent_block_id"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "prev_block_id"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "next_block_id"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "rawText"`);
    await queryRunner.query(`ALTER TABLE "blocks" RENAME COLUMN "data" TO "content"`);
    await queryRunner.query(`ALTER TABLE "blocks" ADD "order_index" double precision NOT NULL DEFAULT '0'`);
    await queryRunner.query(
      `CREATE TYPE "public"."blocks_type_enum" AS ENUM('text', 'video', 'image', 'code', 'quiz', 'survey')`,
    );
    await queryRunner.query(`
      ALTER TABLE "blocks" 
      ALTER COLUMN "type" DROP DEFAULT,
      ALTER COLUMN "type" TYPE "public"."blocks_type_enum" 
      USING (
        CASE "type"
          WHEN 'text' THEN 'text'::"public"."blocks_type_enum"
          WHEN 'video' THEN 'video'::"public"."blocks_type_enum"
          WHEN 'image' THEN 'image'::"public"."blocks_type_enum"
          WHEN 'code' THEN 'code'::"public"."blocks_type_enum"
          WHEN 'quiz' THEN 'quiz'::"public"."blocks_type_enum"
          WHEN 'survey' THEN 'survey'::"public"."blocks_type_enum"
          ELSE 'text'::"public"."blocks_type_enum" -- Fallback для старых данных
        END
      )
    `);
    await queryRunner.query(`ALTER TABLE "blocks" ALTER COLUMN "type" SET DEFAULT 'text'`);
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "blocks__lesson_id__fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_blocks_lesson_order" ON "blocks" ("lesson_id", "order_index")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_blocks_lesson_order"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "blocks__lesson_id__fk"`);
    await queryRunner.query(`ALTER TABLE "blocks" ALTER COLUMN "type" TYPE character varying`);
    await queryRunner.query(`DROP TYPE "public"."blocks_type_enum"`);
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "order_index"`);
    await queryRunner.query(`ALTER TABLE "blocks" RENAME COLUMN "content" TO "data"`);
    await queryRunner.query(`ALTER TABLE "blocks" ADD "rawText" text`);
    await queryRunner.query(`ALTER TABLE "blocks" ADD "deleted_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "blocks" ADD "next_block_id" uuid`);
    await queryRunner.query(`ALTER TABLE "blocks" ADD "prev_block_id" uuid`);
    await queryRunner.query(`ALTER TABLE "blocks" ADD "parent_block_id" uuid`);
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
  }
}
