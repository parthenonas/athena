import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockRequiredAction1767299472706 implements MigrationInterface {
  name = "AddBlockRequiredAction1767299472706";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."blocks_required_action_enum" AS ENUM('view', 'interact', 'submit', 'pass')`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD "required_action" "public"."blocks_required_action_enum" NOT NULL DEFAULT 'view'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blocks" DROP COLUMN "required_action"`);
    await queryRunner.query(`DROP TYPE "public"."blocks_required_action_enum"`);
  }
}
