import { MigrationInterface, QueryRunner } from "typeorm";

export class MediaTables1767126656088 implements MigrationInterface {
  name = "MediaTables1767126656088";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."media_files_access_enum" AS ENUM('public', 'private')`);
    await queryRunner.query(
      `CREATE TABLE "media_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bucket" character varying NOT NULL, "key" character varying NOT NULL, "original_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "size" bigint NOT NULL, "access" "public"."media_files_access_enum" NOT NULL DEFAULT 'private', "owner_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "media_files__id__pk" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_597a7ac56a3d17461223660487" ON "media_files" ("mime_type") `);
    await queryRunner.query(`CREATE INDEX "IDX_1d822866a20309cb876ef2c4f4" ON "media_files" ("owner_id") `);
    await queryRunner.query(
      `CREATE TABLE "media_quotas" ("role_name" character varying NOT NULL, "limit_bytes" bigint NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_10ec9ea2c9f0669b3fa6ac60e93" PRIMARY KEY ("role_name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "media_quotas"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1d822866a20309cb876ef2c4f4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_597a7ac56a3d17461223660487"`);
    await queryRunner.query(`DROP TABLE "media_files"`);
    await queryRunner.query(`DROP TYPE "public"."media_files_access_enum"`);
  }
}
