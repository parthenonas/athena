import { MigrationInterface, QueryRunner } from "typeorm";

export class Profile1769974707253 implements MigrationInterface {
  name = "Profile1769974707253";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "patronymic" character varying(100), "avatar_url" text, "birth_date" date, "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_41ceb255d03a041755091a4378" UNIQUE ("owner_id"), CONSTRAINT "profiles__id__pk" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "profiles__owner_id__fk" FOREIGN KEY ("owner_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`DROP TABLE "profile_records"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "profiles__owner_id__fk"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
  }
}
