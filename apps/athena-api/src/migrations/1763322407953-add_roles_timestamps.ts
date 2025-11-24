import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRolesTimestamps1763322407953 implements MigrationInterface {
  name = "AddRolesTimestamps1763322407953";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "roles"
            ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()
        `);
    await queryRunner.query(`
            ALTER TABLE "roles"
            ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts" DROP CONSTRAINT "accounts__role_id__fk"
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts"
            ALTER COLUMN "role_id"
            SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts"
            ADD CONSTRAINT "accounts__role_id__fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "accounts" DROP CONSTRAINT "accounts__role_id__fk"
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts"
            ALTER COLUMN "role_id" DROP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "accounts"
            ADD CONSTRAINT "accounts__role_id__fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "roles" DROP COLUMN "updated_at"
        `);
    await queryRunner.query(`
            ALTER TABLE "roles" DROP COLUMN "created_at"
        `);
  }
}
