import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateTenantsTable1733958191062 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "tenants",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    isNullable: false,
                    type: "varchar(100)"
                },
                {
                    name: "slug",
                    isNullable: false,
                    isUnique: true,
                    type: "varchar(100)"
                },
                {
                    name: "is_enabled",
                    type: "boolean",
                    default: true
                },
                {
                    name: 'tenant_database_id',
                    isNullable: false,
                    type: 'uuid'
                },
                {
                    name: "created_at",
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: "updated_at",
                    type: 'timestamp',
                    default: 'now()',
                }
            ]
        }))

        await queryRunner.createTable(new Table({
            name: "tenant_databases",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "host",
                    isNullable: false,
                    type: "varchar(255)"
                },
                {
                    name: "port",
                    isNullable: false,
                    type: "integer"
                },
                {
                    name: "database",
                    isNullable: false,
                    type: "text"
                },
                {
                    name: "username",
                    isNullable: false,
                    type: "text"
                },
                {
                    name: "password",
                    isNullable: false,
                    type: "text"
                },
                {
                    name: "certificate",
                    isNullable: true,
                    type: "text",
                    default: null
                },
                {
                    name: "created_at",
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: "updated_at",
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: "migrated_at",
                    type: 'timestamp',
                    isNullable: true,
                    default: null,
                }
            ]
        }))

        await queryRunner.createForeignKey(
            'tenants',
            new TableForeignKey({
                columnNames: ['tenant_database_id'],
                referencedTableName: 'tenant_databases',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE'
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE tenant_databases`);
        await queryRunner.query(`DROP TABLE tenants`);
    }

}
