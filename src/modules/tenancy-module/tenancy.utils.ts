import { DataSource, DataSourceOptions } from 'typeorm';

import { TenantDatabase } from '../admin-modules/tenants/entities/tenant-database.entity';
import { TENANT_ORM_CONFIG } from '../../database/orm.config';

export class TenantConnection {
  private static instance: TenantConnection;
  private connections = new Map<string, { connection: DataSource; timeoutId: NodeJS.Timeout }>();

  private constructor() { }

  public static getInstance(): TenantConnection {
    if (!TenantConnection.instance) {
      TenantConnection.instance = new TenantConnection();
    }
    return TenantConnection.instance;
  }

  public async getConnection(tenantId: string): Promise<DataSource> {
    const connectionName = tenantId === 'default' ? 'nestjs-multi-tenant' : `tenant_${tenantId}`;

    if (this.connections.has(connectionName)) {
      const tenant = this.connections.get(connectionName)!;
      clearTimeout(tenant.timeoutId);
      tenant.timeoutId = this.setConnectionTimeout(connectionName);
      if (!tenant.connection.isInitialized) {
        await tenant.connection.initialize();
      }
      return tenant.connection;
    }

    const connection = new DataSource({
      ...TENANT_ORM_CONFIG,
      database: connectionName,
      schema: 'public'
    } as DataSourceOptions);

    await connection.initialize();
    const timeoutId = this.setConnectionTimeout(connectionName);
    this.connections.set(connectionName, { connection, timeoutId });

    return connection;
  }

  private setConnectionTimeout(connectionName: string): NodeJS.Timeout {
    return setTimeout(() => {
      const tenant = this.connections.get(connectionName);
      if (tenant) {
        tenant.connection.destroy();
        this.connections.delete(connectionName);
      }
    }, 5 * 60 * 60 * 1000); // 5 hours
  }

  async testConnection(tenantDB: TenantDatabase): Promise<DataSource | null> {
    try {
      const { host, port, database, username, password, certificate } = tenantDB.decrypt()
      const connection = new DataSource({
        ...TENANT_ORM_CONFIG,
        schema: 'public',
        host,
        port,
        database,
        username,
        password,
        ssl: !!certificate ? { ca: certificate } : undefined
      } as DataSourceOptions);
      await connection.initialize();
      return connection
    } catch (e) {
      return null
    }
  }

  async migrateDatasource(connection: DataSource) {
    await connection.runMigrations();
    await connection.destroy()
  }
}
