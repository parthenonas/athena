import { MigrationInterface, QueryRunner } from "typeorm";

export class CoursesTitleUk1764284257245 implements MigrationInterface {
  name = "CoursesTitleUk1764284257245";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" ADD CONSTRAINT "courses__title__uk" UNIQUE ("title")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" DROP CONSTRAINT "courses__title__uk"`);
  }
}
