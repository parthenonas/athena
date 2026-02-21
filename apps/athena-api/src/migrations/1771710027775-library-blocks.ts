import { MigrationInterface, QueryRunner } from "typeorm";

export class LibraryBlocks1771710027775 implements MigrationInterface {
  name = "LibraryBlocks1771710027775";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."blocks_type_enum" ADD VALUE IF NOT EXISTS 'quiz_question'`);
    await queryRunner.query(`ALTER TYPE "public"."blocks_type_enum" ADD VALUE IF NOT EXISTS 'quiz_exam'`);
    await queryRunner.query(`
      CREATE TABLE "library_blocks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "type" "public"."blocks_type_enum" NOT NULL DEFAULT 'text',
        "tags" text[] NOT NULL DEFAULT '{}',
        "content" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_library_blocks_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_library_blocks_owner_id" ON "library_blocks" ("owner_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_library_blocks_tags_gin" ON "library_blocks" USING GIN ("tags")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_library_blocks_tags_gin"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_library_blocks_owner_id"`);
    await queryRunner.query(`DROP TABLE "library_blocks"`);
  }
}
