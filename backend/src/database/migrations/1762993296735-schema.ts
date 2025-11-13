import { MigrationInterface, QueryRunner } from "typeorm";

export class Schema1762993296735 implements MigrationInterface {
    name = 'Schema1762993296735'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "issued_invoice" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "company_code" text NOT NULL,
                "company_name" text NOT NULL,
                "issued_date" text NOT NULL,
                "invoice_code" integer NOT NULL,
                "currency" text NOT NULL,
                "ttm" numeric(5, 2),
                CONSTRAINT "PK_efa98109f07b843c66d2d295cb4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "customer_info" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "company_code" text NOT NULL,
                "company_name" text NOT NULL,
                "si_partner_name" text NOT NULL,
                "unit_price" numeric(15, 6) NOT NULL,
                "currency" text NOT NULL,
                CONSTRAINT "UQ_a4712ed82e09582f85bff334926" UNIQUE ("company_code"),
                CONSTRAINT "PK_0db6d2761bf28d6233c20a16c61" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "store_summary" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "company_code" text NOT NULL,
                "store_code" text NOT NULL,
                "store_name" text,
                "date" date NOT NULL,
                "total_labels" integer NOT NULL,
                "product_updated" integer NOT NULL,
                CONSTRAINT "PK_9798432fdd3d304b83cc137fef1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_42491f2fe12f39f230421ab2c6" ON "store_summary" ("company_code", "store_code", "date")
        `);
        await queryRunner.query(`
            ALTER TABLE "issued_invoice"
            ADD CONSTRAINT "FK_8138945eeb9c7f0ef455a56a6d8" FOREIGN KEY ("company_code") REFERENCES "customer_info"("company_code") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "store_summary"
            ADD CONSTRAINT "FK_8556b5aead77ec1ed184d597fd9" FOREIGN KEY ("company_code") REFERENCES "customer_info"("company_code") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "store_summary" DROP CONSTRAINT "FK_8556b5aead77ec1ed184d597fd9"
        `);
        await queryRunner.query(`
            ALTER TABLE "issued_invoice" DROP CONSTRAINT "FK_8138945eeb9c7f0ef455a56a6d8"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_42491f2fe12f39f230421ab2c6"
        `);
        await queryRunner.query(`
            DROP TABLE "store_summary"
        `);
        await queryRunner.query(`
            DROP TABLE "customer_info"
        `);
        await queryRunner.query(`
            DROP TABLE "issued_invoice"
        `);
    }

}
