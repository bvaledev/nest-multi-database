import { AbstractEntity } from "../../../../database/utils/abstract.entity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { TenantDatabase } from "./tenant-database.entity";

@Entity({ name: 'tenants' })
export class Tenant extends AbstractEntity {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, unique: true })
  slug: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @OneToOne(() => TenantDatabase, (db) => db.tenant)
  @JoinColumn({ name: 'tenant_database_id' })
  database: TenantDatabase;
}
