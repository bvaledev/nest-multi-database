import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { TenantDatabase } from '../entities/tenant-database.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantsService } from '../tenants.service';
import { DataSource, ILike } from 'typeorm';
import { TenantConnection } from '../../../tenancy-module/tenancy-connection';
import { TenantPaginationDto } from '../dto/tenant-pagination.dto';

jest.mock('../../../tenancy-module/tenancy-connection', () => {
  return {
    TenantConnection: {
      getInstance: jest.fn()
    },
  };
});

const fakeTenant = {
  id: 'any_tenant_id',
  name: 'any_tenant_name',
  slug: 'any_tenant_slug',
  isEnabled: true,
}

const fakeDatabase = {
  id: 'database_id',
  host: 'localhost',
  port: 5432,
  database: 'db_name',
  username: 'user',
  password: 'password',
  certificate: null,
}

const fakeTenantDatabase = {
  id: fakeTenant.id,
  database: fakeDatabase
}

const fakeTenantRepository = {
  findOneBy: jest.fn().mockResolvedValue(fakeTenant),
  findOne: jest.fn().mockResolvedValue(fakeTenantDatabase),
  findAndCount: jest.fn(),
  save: jest.fn(),
}

const fakeTenantDatabaseRepository = {
  findOne: jest.fn().mockResolvedValue(fakeDatabase),
  update: jest.fn(),
  save: jest.fn()
}

const fakeTransactionManager = {
  save: jest.fn().mockImplementation((data) => {
    return {
      id: 'saved_id',
      ...data
    }
  }),
}

const fakeDataSource: DataSource = {
  manager: {
    transaction: jest.fn(async (callback: (transaction: typeof fakeTransactionManager) => Promise<any>) => {
      return await callback(fakeTransactionManager);
    }),
  },
  getRepository: jest.fn().mockImplementation((entity) => {
    if (entity === Tenant) return fakeTenantRepository;
    if (entity === TenantDatabase) return fakeTenantDatabaseRepository;
    return null;
  }),
} as unknown as DataSource

const mockDataSource = {
  runMigrations: jest.fn(),
  destroy: jest.fn()
}
const tenantConnectionMock = {
  createConnection: jest.fn().mockResolvedValue(mockDataSource)
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    service = new TenantsService(fakeDataSource)
  });

  describe('findTenantBySlug()', () => {
    it('should call with correct values', async () => {
      const result = await service['findTenantBySlug']('tenant_id')

      expect(fakeTenantRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findOneBy).toHaveBeenCalledWith({ slug: "tenant_id" });
      expect(result).toEqual(fakeTenant)
    });
  });

  describe('getDatabaseByTenantId()', () => {
    it('should call with correct values', async () => {
      const result = await service['getDatabaseByTenantId']('tenant_id')

      expect(fakeTenantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findOne).toHaveBeenCalledWith({
        where: { id: "tenant_id" },
        relations: { database: true },
        select: {
          id: true,
          database: {
            id: true,
            host: true,
            port: true,
            database: true,
            username: true,
            password: true,
            certificate: true,
          },
        }
      });
      expect(result).toEqual(fakeTenantDatabase)
    });
  });

  describe('createTenant()', () => {
    const input: CreateTenantDto = {
      name: "empresa4",
      slug: "empresa4",
      isEnabled: true,
      database: {
        host: "localhost",
        port: 5432,
        database: "empresa4",
        username: "postgres",
        password: "root",
        certificate: "ANY_CERTIFICATE"
      }
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should throw if tenant slug already exists', async () => {
      const promise = service.createTenant(input)

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant already exists"))
    });

    it('should create a tenant with correct values', async () => {
      jest.spyOn(service as any, 'findTenantBySlug').mockResolvedValueOnce(null)

      const result = await service.createTenant(input)

      const expectedTenantDatabase = {
        host: "localhost",
        port: 5432,
        database: expect.not.stringContaining(input.database.database),
        password: expect.not.stringContaining(input.database.password),
        username: expect.not.stringContaining(input.database.username),
        certificate: expect.not.stringContaining(input.database.certificate),
      }
      const expectedTenant = {
        isEnabled: true,
        name: "empresa4",
        slug: "empresa4",
        database: expect.objectContaining(expectedTenantDatabase)
      }

      expect(fakeTransactionManager.save).toHaveBeenNthCalledWith(1, expectedTenantDatabase)
      expect(fakeTransactionManager.save).toHaveBeenNthCalledWith(2, expect.objectContaining(expectedTenant))
      expect(result).toEqual({ tenantId: 'saved_id' })
    });

    it('should create a tenant without certificate', async () => {
      jest.spyOn(service as any, 'findTenantBySlug').mockResolvedValueOnce(null)

      const result = await service.createTenant({
        ...input,
        database: {
          ...input.database,
          certificate: null
        }
      })

      const expectedTenantDatabase = {
        host: "localhost",
        port: 5432,
        certificate: null,
      }

      expect(fakeTransactionManager.save).toHaveBeenNthCalledWith(1, expect.objectContaining(expectedTenantDatabase))
      expect(result).toEqual({ tenantId: 'saved_id' })
    });
  });

  describe('testTenantDatabaseConnection()', () => {
    beforeEach(() => {
      (TenantConnection.getInstance as jest.Mock).mockReturnValue(tenantConnectionMock);
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should throw if tenant does not exists', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce(null)

      const promise = service.testTenantDatabaseConnection('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant not found"))
    });

    it('should throw if tenant database does not exists', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce({
        ...fakeTenantDatabase,
        database: undefined
      })

      const promise = service.testTenantDatabaseConnection('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant database not found"))
    });

    it('should throw when connection is invalid', async () => {
      tenantConnectionMock.createConnection.mockResolvedValueOnce(null)

      const promise = service.testTenantDatabaseConnection('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Invalid database connection"))
    });

    it('should validate connection', async () => {
      await service.testTenantDatabaseConnection('tenant_id')

      expect(tenantConnectionMock.createConnection).toHaveBeenCalledTimes(1)
    });
  });

  describe('migrateTenantDatabase()', () => {
    beforeEach(() => {
      (TenantConnection.getInstance as jest.Mock).mockReturnValue(tenantConnectionMock);

      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValue(fakeTenantDatabase)
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should throw when migration fails', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockImplementationOnce(() => {
        throw new Error('any_error')
      })

      const promise = service.migrateTenantDatabase('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Migration run failed"))
    });

    it('should throw when tenant does not exists', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce(null)

      const promise = service.migrateTenantDatabase('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant not found"))
    });

    it('should throw when tenant database does not exists', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce({
        ...fakeTenantDatabase,
        database: undefined
      })

      const promise = service.migrateTenantDatabase('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant database not found"))
    });

    it('should throw when tenant database does not exists', async () => {
      tenantConnectionMock.createConnection.mockResolvedValueOnce(null)

      const promise = service.migrateTenantDatabase('tenant_id')

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Invalid database connection"))
    });

    it('should throw when tenant database does not exists', async () => {
      await service.migrateTenantDatabase('tenant_id')

      expect(mockDataSource.runMigrations).toHaveBeenCalledTimes(1)
      expect(mockDataSource.destroy).toHaveBeenCalledTimes(1)
      expect(fakeTenantDatabaseRepository.update).toHaveBeenCalledTimes(1)
      expect(fakeTenantDatabaseRepository.update).toHaveBeenCalledWith("database_id", { migratedAt: expect.anything() })
    });

  });

  describe('findAllWithPagination()', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return paginated tenants with search term', async () => {
      const paginationDto: TenantPaginationDto = {
        search: 'test',
        page: 1,
        limit: 10,
      };

      const mockTenants = [{ id: 'tenant1', name: 'Test Tenant' }];
      const mockTotal = 1;
      fakeTenantRepository.findAndCount = jest.fn().mockResolvedValue([mockTenants, mockTotal]);

      const result = await service.findAllWithPagination(paginationDto);

      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledWith({
        where: { name: ILike('%test%') },
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: mockTenants,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return paginated tenants without search term', async () => {
      const paginationDto: TenantPaginationDto = {
        search: null,
        page: 2,
        limit: 5,
      };

      const mockTenants = [
        { id: 'tenant1', name: 'Tenant A' },
        { id: 'tenant2', name: 'Tenant B' },
      ];
      const mockTotal = 12;

      fakeTenantRepository.findAndCount = jest.fn().mockResolvedValue([mockTenants, mockTotal]);

      const result = await service.findAllWithPagination(paginationDto);

      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        take: 5,
        skip: 5, // Página 2, 5 registros por página
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: mockTenants,
        total: mockTotal,
        page: 2,
        limit: 5,
        totalPages: 3, // Math.ceil(12 / 5)
      });
    });

    it('should handle empty results', async () => {
      const paginationDto: TenantPaginationDto = {
        search: null,
        page: 1,
        limit: 10,
      };

      fakeTenantRepository.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      const result = await service.findAllWithPagination(paginationDto);

      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should calculate skip correctly for higher pages', async () => {
      const paginationDto: TenantPaginationDto = {
        search: 'tenant',
        page: 3,
        limit: 20,
      };

      const mockTenants = [
        { id: 'tenant1', name: 'Tenant A' },
        { id: 'tenant2', name: 'Tenant B' },
      ];
      const mockTotal = 100;

      fakeTenantRepository.findAndCount = jest.fn().mockResolvedValue([mockTenants, mockTotal]);

      const result = await service.findAllWithPagination(paginationDto);

      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findAndCount).toHaveBeenCalledWith({
        where: { name: ILike('%tenant%') },
        take: 20,
        skip: 40, // Página 3, 20 registros por página (20 * (3 - 1))
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: mockTenants,
        total: mockTotal,
        page: 3,
        limit: 20,
        totalPages: 5, // Math.ceil(100 / 20)
      });
    });
  });

  describe('findOne()', () => {
    it('should call with correct values', async () => {
      fakeTenantRepository.findOne.mockResolvedValue(fakeTenant)

      const result = await service.findOne('tenant_id')

      expect(fakeTenantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: "tenant_id",
        }
      });
      expect(result).toEqual(fakeTenant)
    });
  });

  describe('getTenantDatabase()', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should call with correct values', async () => {
      const result = await service.getTenantDatabase('tenant_id')

      expect(fakeTenantDatabaseRepository.findOne).toHaveBeenCalledTimes(1);
      expect(fakeTenantDatabaseRepository.findOne).toHaveBeenCalledWith({
        where: {
          tenant: {
            id: 'tenant_id'
          }
        },
        relations: {
          tenant: true
        }
      });
      expect(result).toEqual(fakeDatabase)
    });

    it('should call with correct values', async () => {
      fakeTenantDatabaseRepository.findOne.mockResolvedValueOnce(null)

      const promise = service.getTenantDatabase('tenant_id')

      await expect(promise).rejects.toThrow(new NotFoundException('Database not found'))
    });
  });

  describe('getDatabaseByTenantSlug()', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should call with correct values', async () => {
      fakeTenantRepository.findOne.mockResolvedValue(fakeTenantDatabase)

      const result = await service.getDatabaseByTenantSlug('any_slug')

      expect(fakeTenantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(fakeTenantRepository.findOne).toHaveBeenCalledWith({
        where: {
          slug: 'any_slug',
        },
        relations: {
          database: true
        },
        select: {
          id: true,
          database: {
            id: true,
            host: true,
            port: true,
            database: true,
            username: true,
            password: true,
            certificate: true,
          },
        }
      });
      expect(result).toEqual(fakeTenantDatabase)
    });
  });

  describe('updateDatabase()', () => {
    const input = {
      host: "localhost",
      port: 5432,
      database: "empresa3",
      username: "postgres",
      password: "root",
      certificate: "ANY_CERTIFICATE"
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should throw when tenant does not exists', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce(null)

      const promise = service.updateDatabase('any_tenant', input)

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant or database not found"))
    });

    it('should throw when tenant database does not exists', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce({
        ...TenantDatabase,
        database: undefined
      })

      const promise = service.updateDatabase('any_tenant', input)

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant or database not found"))
    });

    it('should update with correct values', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce({
        ...TenantDatabase,
        database: new TenantDatabase()
      })

      await service.updateDatabase('any_tenant', input)

      const expectedTenantDatabase = {
        host: "localhost",
        port: 5432,
        database: expect.not.stringContaining(input.database),
        password: expect.not.stringContaining(input.password),
        username: expect.not.stringContaining(input.username),
        certificate: expect.not.stringContaining(input.certificate),
      }
      expect(fakeTenantDatabaseRepository.save).toHaveBeenCalledTimes(1)
      expect(fakeTenantDatabaseRepository.save).toHaveBeenCalledWith(expectedTenantDatabase)
    });

    it('should update with correct values without certificate', async () => {
      jest.spyOn(service as any, 'getDatabaseByTenantId').mockResolvedValueOnce({
        ...TenantDatabase,
        database: new TenantDatabase()
      })

      await service.updateDatabase('any_tenant', {
        ...input,
        certificate: null
      })

      const expectedTenantDatabase = {
        host: "localhost",
        port: 5432,
        database: expect.not.stringContaining(input.database),
        password: expect.not.stringContaining(input.password),
        username: expect.not.stringContaining(input.username),
        certificate: null,
      }
      expect(fakeTenantDatabaseRepository.save).toHaveBeenCalledTimes(1)
      expect(fakeTenantDatabaseRepository.save).toHaveBeenCalledWith(expectedTenantDatabase)
    });
  });

  describe('updateTenant()', () => {
    const input = {
      name: 'tenant_name',
      slug: 'tenant_slug',
      isEnabled: true,
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should throw when tenant does not exists', async () => {
      fakeTenantRepository.findOne.mockResolvedValueOnce(null)

      const promise = service.updateTenant('any_tenant', input)

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant not found"))
    });

    it('should throw tenant already exists when slug is different', async () => {
      fakeTenantRepository.findOne.mockResolvedValueOnce(fakeTenant)
      jest.spyOn(service as any, 'findTenantBySlug').mockResolvedValueOnce(fakeTenant)

      const promise = service.updateTenant('any_tenant', input)

      await expect(promise).rejects.toThrow(new UnprocessableEntityException("Tenant already exists"))
    });

    it('should update with correct values', async () => {
      fakeTenantRepository.findOne.mockResolvedValueOnce(fakeTenant)
      jest.spyOn(service as any, 'findTenantBySlug').mockResolvedValueOnce(null)

      await service.updateTenant('any_tenant', input)

      expect(fakeTenantRepository.save).toHaveBeenCalledTimes(1)
      expect(fakeTenantRepository.save).toHaveBeenCalledWith({
        "id": fakeTenant.id, ...input
      })
    });
  });
});
