import { DataSource } from 'typeorm';
import { TenantConnection } from '../tenancy-connection';
import { TenantDatabase } from '../../admin-modules/tenants/entities/tenant-database.entity';
import AppDataSource from '../../../database/admin.datasource';

jest.mock('../../../database/admin.datasource', () => ({
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
    })),
    isInitialized: false,
  },
}));

jest.mock('../../admin-modules/tenants/entities/tenant-database.entity', () => ({
  TenantDatabase: class MockTenantDatabase { },
}));

jest.mock('typeorm');

describe('TenantConnection', () => {
  let tenantConnection;

  beforeEach(async () => {
    tenantConnection = TenantConnection.getInstance();
    await tenantConnection.closeAllConnections();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    tenantConnection['connections'].clear();
  });

  it('should create an instance of TenantConnection', () => {
    expect(tenantConnection).toBeDefined();
  });

  describe('getConnection', () => {
    it('should reuse an existing connection', async () => {
      const mockConnection = new DataSource({} as any);
      const setConnectionTimeoutSpy = jest
        .spyOn(tenantConnection as any, 'setConnectionTimeout')
        .mockReturnValueOnce(setTimeout(() => { }, 0));

      tenantConnection['connections'].set('test-slug', {
        connection: mockConnection,
        timeoutId: setTimeout(() => { }, 0),
      });

      const connection = await tenantConnection.getConnection('test-slug');
      expect(connection).toBe(mockConnection);
      expect(setConnectionTimeoutSpy).toHaveBeenCalledWith('test-slug');
    });

    it('should create a new connection if none exists', async () => {
      const mockTenantDatabase = {
        decrypt: jest.fn().mockReturnValue({
          host: 'localhost',
          port: 5432,
          database: 'test-db',
          username: 'user',
          password: 'password',
          certificate: null,
        }),
      } as unknown as TenantDatabase;

      jest.spyOn(tenantConnection as any, 'getDatabaseByTenantSlug').mockResolvedValueOnce(mockTenantDatabase);
      jest.spyOn(tenantConnection, 'createConnection').mockResolvedValueOnce(new DataSource({} as any));

      const connection = await tenantConnection.getConnection('new-slug');
      expect(connection).toBeDefined();
    });
  });

  describe('createConnection', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize and return a new DataSource without SSL', async () => {
      const mockTenantDatabase = {
        decrypt: jest.fn().mockReturnValueOnce({
          host: 'localhost',
          port: 5432,
          database: 'test-db',
          username: 'user',
          password: 'password',
          certificate: null,
        }),
      } as unknown as TenantDatabase;

      const dataSourceSpy = jest.spyOn(DataSource.prototype, 'initialize').mockImplementationOnce(() => {
        return Promise.resolve(new DataSource({} as any));
      });

      const connection = await tenantConnection.createConnection(mockTenantDatabase);

      expect(connection).toBeDefined();
      expect(dataSourceSpy).toHaveBeenCalledTimes(1);
      expect(DataSource).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: undefined,
        })
      );
    });

    it('should initialize and return a new DataSource with SSL', async () => {
      const mockTenantDatabase = {
        decrypt: jest.fn().mockReturnValueOnce({
          host: 'localhost',
          port: 5432,
          database: 'test-db',
          username: 'user',
          password: 'password',
          certificate: 'ANY_CERT',
        }),
      } as unknown as TenantDatabase;

      const dataSourceSpy = jest.spyOn(DataSource.prototype, 'initialize').mockImplementationOnce(() => {
        return Promise.resolve(new DataSource({} as any));
      });

      const connection = await tenantConnection.createConnection(mockTenantDatabase);

      expect(connection).toBeDefined();
      expect(dataSourceSpy).toHaveBeenCalledTimes(1);
      expect(DataSource).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { ca: 'ANY_CERT' },
        })
      );
    });
  });

  describe('getDatabaseByTenantSlug', () => {
    it('should initialize default datasource', async () => {
      const mockTenantDatabase = {
        decrypt: jest.fn().mockReturnValue({
          host: 'localhost',
          port: 5432,
          database: 'test-db',
          username: 'user',
          password: 'password',
          certificate: null,
        }),
      } as unknown as TenantDatabase;

      const repo = { findOne: jest.fn().mockResolvedValueOnce(mockTenantDatabase) };
      jest.spyOn(AppDataSource, 'getRepository').mockReturnValueOnce(repo as any);

      const initializeSpy = jest.spyOn(AppDataSource, 'initialize');

      expect(AppDataSource.isInitialized).toBe(false);

      await tenantConnection['getDatabaseByTenantSlug']('any_tenant');

      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });

    it('should destroy datasource', async () => {
      const mockTenantDatabase = {
        decrypt: jest.fn().mockReturnValue({
          host: 'localhost',
          port: 5432,
          database: 'test-db',
          username: 'user',
          password: 'password',
          certificate: null,
        }),
      } as unknown as TenantDatabase;

      const repo = { findOne: jest.fn().mockResolvedValueOnce(mockTenantDatabase) };
      jest.spyOn(AppDataSource, 'getRepository').mockReturnValueOnce(repo as any);

      const destroySpy = jest.spyOn(AppDataSource, 'destroy');

      await tenantConnection['getDatabaseByTenantSlug']('any_tenant');

      expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it('should throw if no database found', async () => {
      const repo = { findOne: jest.fn().mockResolvedValueOnce(null) };
      jest.spyOn(AppDataSource, 'getRepository').mockReturnValueOnce(repo as any);

      const promise = tenantConnection['getDatabaseByTenantSlug']('any_tenant');

      await expect(promise).rejects.toThrow(new Error(`No tenant database found for slug: any_tenant`));
    });
  });

  describe('closeConnection', () => {
    it('should close an existing connection', async () => {
      const mockConnection = new DataSource({} as any);
      mockConnection.destroy = jest.fn();

      tenantConnection['connections'].set('test-slug', {
        connection: mockConnection,
        timeoutId: setTimeout(() => { }, 0),
      });

      await tenantConnection.closeConnection('test-slug');
      expect(mockConnection.destroy).toHaveBeenCalled();
      expect(tenantConnection['connections'].has('test-slug')).toBe(false);
    });
  });

  describe('closeAllConnections', () => {
    it('should close all connections', async () => {
      const mockConnection = new DataSource({} as any);
      mockConnection.destroy = jest.fn();

      tenantConnection['connections'].set('test-slug-1', {
        connection: mockConnection,
        timeoutId: setTimeout(() => { }, 0),
      });

      tenantConnection['connections'].set('test-slug-2', {
        connection: mockConnection,
        timeoutId: setTimeout(() => { }, 0),
      });

      await tenantConnection.closeAllConnections();
      expect(mockConnection.destroy).toHaveBeenCalledTimes(2);
      expect(tenantConnection['connections'].size).toBe(0);
    });
  });

  describe('setConnectionTimeout', () => {
    it('should call setTimeout and remove connection after timer expires', async () => {
      jest.useFakeTimers();

      const mockDestroy = jest.fn();
      tenantConnection['connections'].set('existing_tenant', {
        connection: { destroy: mockDestroy } as any,
        timeoutId: setTimeout(() => { }, 0),
      });

      const timeout = tenantConnection['setConnectionTimeout']('existing_tenant');

      expect(timeout).toBeDefined();
      expect(tenantConnection['connections'].has('existing_tenant')).toBe(true);

      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(tenantConnection['connections'].has('existing_tenant')).toBe(false);
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });
  });
});
