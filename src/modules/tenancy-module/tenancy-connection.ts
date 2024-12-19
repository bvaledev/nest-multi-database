import { DataSource, DataSourceOptions } from 'typeorm';
import { TenantDatabase } from '../admin-modules/tenants/entities/tenant-database.entity';
import { TENANT_ORM_CONFIG } from '../../database/orm.config';
import AppDataSource from '../../database/admin.datasource';

type Connection = {
  connection: DataSource
  timeoutId: NodeJS.Timeout
}

export class TenantConnection {
  private static instance: TenantConnection;
  private connections = new Map<string, Connection>();

  private constructor() { }

  public static getInstance(): TenantConnection {
    if (!TenantConnection.instance) {
      TenantConnection.instance = new TenantConnection();
    }
    return TenantConnection.instance;
  }

  public async getConnection(tenantSlug: string): Promise<DataSource> {
    if (this.connections.has(tenantSlug)) {
      const tenant = this.connections.get(tenantSlug);
      clearTimeout(tenant.timeoutId);
      tenant.timeoutId = this.setConnectionTimeout(tenantSlug);
      if (!tenant.connection.isInitialized) {
        await tenant.connection.initialize();
      }
      return tenant.connection;
    }
    const tenantDB = await this.getDatabaseByTenantSlug(tenantSlug);
    const connection = await this.createConnection(tenantDB);
    const timeoutId = this.setConnectionTimeout(tenantSlug);
    this.connections.set(tenantSlug, { connection, timeoutId });
    return connection;
  }

  async createConnection(tenantDB: TenantDatabase): Promise<DataSource> {
    const { certificate, ...credentials } = tenantDB.decrypt();
    const connection = new DataSource({
      ...TENANT_ORM_CONFIG,
      ...credentials,
      ssl: !!certificate ? { ca: certificate } : undefined,
      schema: 'public',
    } as DataSourceOptions);

    return await connection.initialize();
  }

  private async getDatabaseByTenantSlug(tenantSlug: string): Promise<TenantDatabase> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    try {
      const tenantDatabase = await AppDataSource.getRepository(TenantDatabase).findOne({
        where: { tenant: { slug: tenantSlug } },
        relations: { tenant: true },
      });

      if (!tenantDatabase) {
        throw new Error(`No tenant database found for slug: ${tenantSlug}`);
      }

      return tenantDatabase;
    } finally {
      await AppDataSource.destroy();
    }
  }

  private setConnectionTimeout(tenantSlug: string): NodeJS.Timeout {
    return setTimeout(() => {
      const tenant = this.connections.get(tenantSlug);
      if (tenant) {
        tenant.connection.destroy(); // Fecha a conexão
        this.connections.delete(tenantSlug); // Remove do mapa
      }
    }, 5 * 60 * 1000); // Timeout de 5 minutos
  }

  public async closeConnection(tenantSlug: string): Promise<void> {
    if (this.connections.has(tenantSlug)) {
      const { connection } = this.connections.get(tenantSlug);
      await connection.destroy();
      this.connections.delete(tenantSlug);
    }
  }

  public async closeAllConnections(): Promise<void> {
    for (const [tenantSlug, { connection }] of this.connections.entries()) {
      await connection.destroy();
      this.connections.delete(tenantSlug);
    }
  }
}