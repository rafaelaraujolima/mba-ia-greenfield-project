import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoEditingColumns1790122198040 implements MigrationInterface {
  name = 'AddVideoEditingColumns1790122198040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "videos" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "videos" ADD "category_id" uuid`);
    await queryRunner.query(
      `CREATE TYPE "public"."videos_visibility_enum" AS ENUM('public', 'unlisted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "visibility" "public"."videos_visibility_enum" NOT NULL DEFAULT 'public'`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD "published_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9fe0463a9fa4899f41ab73651" ON "videos" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4dbcf6f91622154d0362d1e50f" ON "videos" ("channel_id", "visibility", "published_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD CONSTRAINT "FK_f9fe0463a9fa4899f41ab736511" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" DROP CONSTRAINT "FK_f9fe0463a9fa4899f41ab736511"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4dbcf6f91622154d0362d1e50f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9fe0463a9fa4899f41ab73651"`,
    );
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "published_at"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "visibility"`);
    await queryRunner.query(`DROP TYPE "public"."videos_visibility_enum"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "category_id"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "description"`);
  }
}
