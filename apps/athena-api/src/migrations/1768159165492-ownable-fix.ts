import { MigrationInterface, QueryRunner } from "typeorm";

export class OwnableFix1768159165492 implements MigrationInterface {
  name = "OwnableFix1768157000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "instructors" DROP CONSTRAINT "instructors__account_id__uk"`);
    await queryRunner.query(`ALTER TABLE "instructors" RENAME COLUMN "account_id" TO "owner_id"`);
    await queryRunner.query(`ALTER TABLE "instructors" ADD CONSTRAINT "instructors__owner_id__uk" UNIQUE ("owner_id")`);
    await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments__cohort_account__uk"`);
    await queryRunner.query(`DROP INDEX "enrollments__account_id__idx"`);
    await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "account_id" TO "owner_id"`);
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments__cohort_owner__uk" UNIQUE ("cohort_id", "owner_id")`,
    );
    await queryRunner.query(`CREATE INDEX "enrollments__owner_id__idx" ON "enrollments" ("owner_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments__cohort_owner__uk"`);
    await queryRunner.query(`DROP INDEX "enrollments__owner_id__idx"`);

    await queryRunner.query(`ALTER TABLE "enrollments" RENAME COLUMN "owner_id" TO "account_id"`);

    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments__cohort_account__uk" UNIQUE ("cohort_id", "account_id")`,
    );
    await queryRunner.query(`CREATE INDEX "enrollments__account_id__idx" ON "enrollments" ("account_id")`);

    await queryRunner.query(`ALTER TABLE "instructors" DROP CONSTRAINT "instructors__owner_id__uk"`);

    await queryRunner.query(`ALTER TABLE "instructors" RENAME COLUMN "owner_id" TO "account_id"`);

    await queryRunner.query(
      `ALTER TABLE "instructors" ADD CONSTRAINT "instructors__account_id__uk" UNIQUE ("account_id")`,
    );
  }
}
