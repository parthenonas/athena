import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthorIdToOwnerId1764283251567 implements MigrationInterface {
  name = "AuthorIdToOwnerId1764283251567";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" RENAME COLUMN "author_id" TO "owner_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" RENAME COLUMN "owner_id" TO "author_id"`);
  }
}
