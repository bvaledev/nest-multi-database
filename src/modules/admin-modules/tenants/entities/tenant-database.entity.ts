import { Column, Entity, OneToOne } from "typeorm";
import { AbstractEntity } from "../../../../database/utils/abstract.entity";
import { decrypt, encrypt } from "../../../../utils/encrypt";
import { Tenant } from "./tenant.entity";

@Entity({ name: 'tenant_databases' })
export class TenantDatabase extends AbstractEntity {
  @Column({ nullable: false, length: 255 })
  host: string;

  @Column({ nullable: false })
  port: number;

  @Column({ nullable: false, select: false })
  database: string;

  @Column({ nullable: false, select: false })
  username: string;

  @Column({ nullable: false, select: false })
  password: string;

  @Column({ nullable: true, select: false })
  certificate: string | null;

  @OneToOne(() => Tenant, (tenant) => tenant.database)
  tenant: Tenant;

  @Column({ name: 'migrated_at', nullable: true })
  migratedAt?: Date | null;

  setDatabase(text: string) {
    this.database = encrypt(text)
  }

  setUsername(text: string) {
    this.username = encrypt(text)
  }

  setPassword(text: string) {
    this.password = encrypt(text)
  }

  setCertificate(text: string) {
    this.certificate = encrypt(text)
  }

  decrypt() {
    return {
      host: this.host,
      port: this.port,
      database: this.database ? decrypt(this.database) : null,
      username: this.username ? decrypt(this.username) : null,
      password: this.password ? decrypt(this.password) : null,
      certificate: this.certificate ? decrypt(this.certificate) : null,
    }
  }
}
