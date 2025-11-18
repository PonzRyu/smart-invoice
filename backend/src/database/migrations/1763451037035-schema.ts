import { MigrationInterface, QueryRunner } from "typeorm";

export class Schema1763451037035 implements MigrationInterface {
    name = 'Schema1763451037035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "store_master" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "company_code" text NOT NULL,
                "store_code" text NOT NULL,
                "store_name" text NOT NULL,
                CONSTRAINT "UQ_225f3eed0dce4d3c20cf12ecf37" UNIQUE ("store_code"),
                CONSTRAINT "PK_4482cb140e3ef207bcda1b55636" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "store_master"
        `);
    }

}
