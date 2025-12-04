import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1763152998520 implements MigrationInterface {
  name = "Init1763152998520";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "permissions" jsonb NOT NULL DEFAULT '[]',
                "policies" jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "roles__name__uk" UNIQUE ("name"),
                CONSTRAINT "roles__id__pk" PRIMARY KEY ("id")
            ) 
        `);
    await queryRunner.query(`
            CREATE TABLE "accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "login" character varying NOT NULL,
                "password_hash" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'active',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "role_id" uuid,
                CONSTRAINT "accounts__login__uk" UNIQUE ("login"),
                CONSTRAINT "accounts__id__pk" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "profile_records" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "value" text NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "account_id" uuid,
                CONSTRAINT "profile_records__id__pk" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "profile_records__account_name__idx" ON "profile_records" ("account_id", "name")
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts"
            ADD CONSTRAINT "accounts__role_id__fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "profile_records"
            ADD CONSTRAINT "profile_records__account_id__fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "profile_records" DROP CONSTRAINT "profile_records__account_id__fk"
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts" DROP CONSTRAINT "accounts__role_id__fk"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."profile_records__account_name__idx"
        `);
    await queryRunner.query(`
            DROP TABLE "profile_records"
        `);
    await queryRunner.query(`
            DROP TABLE "accounts"
        `);
    await queryRunner.query(`
            DROP TABLE "roles"
        `);
  }
}
