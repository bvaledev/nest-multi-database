import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from '../tenants.controller';
import { TenantsService } from '../tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { TenantPaginationDto } from '../dto/tenant-pagination.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { TenantDatabaseDto } from '../dto/tenant-database.dto';

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: TenantsService;

  const fakeTenantsService = {
    createTenant: jest.fn(),
    findAllWithPagination: jest.fn(),
    findOne: jest.fn(),
    updateTenant: jest.fn(),
    updateDatabase: jest.fn(),
    testTenantDatabaseConnection: jest.fn(),
    migrateTenantDatabase: jest.fn(),
    getTenantDatabase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: fakeTenantsService,
        },
      ],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
    service = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should call createTenant with correct values', async () => {
      const createTenantDto: CreateTenantDto = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        isEnabled: true,
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'admin',
          password: 'password123',
          certificate: null,
        },
      };

      fakeTenantsService.createTenant.mockResolvedValue({ tenantId: '123' });

      const result = await controller.create(createTenantDto);

      expect(service.createTenant).toHaveBeenCalledWith(createTenantDto);
      expect(result).toEqual({ tenantId: '123' });
    });
  });

  describe('findAll()', () => {
    it('should call findAllWithPagination with correct values', async () => {
      const paginationDto: TenantPaginationDto = { search: 'test', page: 1, limit: 10 };

      fakeTenantsService.findAllWithPagination.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.findAll(paginationDto);

      expect(service.findAllWithPagination).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findOne()', () => {
    it('should call findOne with correct tenantId', async () => {
      fakeTenantsService.findOne.mockResolvedValue({ id: '123', name: 'Test Tenant' });

      const result = await controller.findOne('123');

      expect(service.findOne).toHaveBeenCalledWith('123');
      expect(result).toEqual({ id: '123', name: 'Test Tenant' });
    });
  });

  describe('update()', () => {
    it('should call updateTenant with correct values', async () => {
      const updateTenantDto: UpdateTenantDto = {
        name: 'Updated Tenant',
        slug: 'updated-tenant',
        isEnabled: false,
      };

      fakeTenantsService.updateTenant.mockResolvedValue(undefined);

      const result = await controller.update('123', updateTenantDto);

      expect(service.updateTenant).toHaveBeenCalledWith('123', updateTenantDto);
      expect(result).toBeUndefined();
    });
  });

  describe('updateDatabase()', () => {
    it('should call updateDatabase with correct values', async () => {
      const tenantDatabaseDto: TenantDatabaseDto = {
        host: 'localhost',
        port: 5432,
        database: 'updated_db',
        username: 'admin',
        password: 'password123',
        certificate: 'certificate-content',
      };

      fakeTenantsService.updateDatabase.mockResolvedValue(undefined);

      const result = await controller.updateDatabase('123', tenantDatabaseDto);

      expect(service.updateDatabase).toHaveBeenCalledWith('123', tenantDatabaseDto);
      expect(result).toBeUndefined();
    });
  });

  describe('testConnection()', () => {
    it('should call testTenantDatabaseConnection with correct tenantId', async () => {
      fakeTenantsService.testTenantDatabaseConnection.mockResolvedValue(undefined);

      const result = await controller.testConnection('123');

      expect(service.testTenantDatabaseConnection).toHaveBeenCalledWith('123');
      expect(result).toBeUndefined();
    });
  });

  describe('runMigration()', () => {
    it('should call migrateTenantDatabase with correct tenantId', async () => {
      fakeTenantsService.migrateTenantDatabase.mockResolvedValue(undefined);

      const result = await controller.runMigration('123');

      expect(service.migrateTenantDatabase).toHaveBeenCalledWith('123');
      expect(result).toBeUndefined();
    });
  });

  describe('tenantDatabase()', () => {
    it('should call getTenantDatabase with correct tenantId', async () => {
      fakeTenantsService.getTenantDatabase.mockResolvedValue({
        host: 'localhost',
        port: 5432,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        migratedAt: new Date('2023-01-03'),
      });

      const result = await controller.tenantDatabase('123');

      expect(service.getTenantDatabase).toHaveBeenCalledWith('123');
      expect(result).toEqual({
        host: 'localhost',
        port: 5432,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        migratedAt: new Date('2023-01-03'),
      });
    });
  });
});
