import { HttpException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { DataSource, Repository, ILike } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantDatabase } from './entities/tenant-database.entity';
import { TenantConnection } from '../../tenancy-module/tenancy-connection';
import { TenantPaginationDto } from './dto/tenant-pagination.dto';
import { TenantDatabaseDto } from './dto/tenant-database.dto';

@Injectable()
export class TenantsService {
  private readonly tenantRepository: Repository<Tenant>;
  private readonly tenantDatabaseRepository: Repository<TenantDatabase>;

  constructor(private readonly dataSource: DataSource) {
    this.tenantRepository = dataSource.getRepository(Tenant);
    this.tenantDatabaseRepository = dataSource.getRepository(TenantDatabase);
  }

  async createTenant(createTenantDto: CreateTenantDto) {
    const tenantExists = await this.findTenantBySlug(createTenantDto.slug)
    if (!!tenantExists) {
      throw new UnprocessableEntityException("Tenant already exists")
    }
    const tenant = await this.dataSource.manager.transaction(async (transaction) => {
      const database = new TenantDatabase()
      database.host = createTenantDto.database.host;
      database.port = createTenantDto.database.port;
      database.setDatabase(createTenantDto.database.database);
      database.setUsername(createTenantDto.database.username);
      database.setPassword(createTenantDto.database.password);
      if (createTenantDto.database.certificate) {
        database.setCertificate(createTenantDto.database.certificate);
      } else {
        database.certificate = null;
      }

      const newTenant = new Tenant();
      newTenant.name = createTenantDto.name;
      newTenant.slug = createTenantDto.slug;
      newTenant.isEnabled = createTenantDto.isEnabled;
      newTenant.database = await transaction.save(database);
      return await transaction.save(newTenant);
    });

    return { tenantId: tenant.id };
  }

  async testTenantDatabaseConnection(tenantId: string) {
    const tenantExists = await this.getDatabaseByTenantId(tenantId)
    if (!tenantExists) {
      throw new UnprocessableEntityException("Tenant not found")
    }
    if (!tenantExists.database) {
      throw new UnprocessableEntityException("Tenant database not found")
    }
    const tenantManager = TenantConnection.getInstance()
    const connection = await tenantManager.createConnection(tenantExists.database)
    if (!connection) {
      throw new UnprocessableEntityException("Invalid database connection")
    }
    await connection.destroy()
  }

  async migrateTenantDatabase(tenantId: string) {
    try {
      const tenantExists = await this.getDatabaseByTenantId(tenantId)
      if (!tenantExists) throw new UnprocessableEntityException("Tenant not found")
      if (!tenantExists.database) throw new UnprocessableEntityException("Tenant database not found")
      const tenantManager = TenantConnection.getInstance()
      const connection = await tenantManager.createConnection(tenantExists.database)
      if (!connection) throw new UnprocessableEntityException("Invalid database connection")
      await connection.runMigrations()
      await connection.destroy()
      await this.tenantDatabaseRepository.update(tenantExists.database.id, {
        migratedAt: new Date(),
      });
    } catch (e) {
      if (e instanceof HttpException) {
        throw new UnprocessableEntityException(e.message)
      }
      throw new UnprocessableEntityException("Migration run failed")
    }
  }

  async findAllWithPagination(paginationDto: TenantPaginationDto) {
    const { search, page, limit } = paginationDto;

    // Calcula o offset (registros a pular)
    const skip = (page - 1) * limit;

    // Configura a consulta
    const [data, total] = await this.tenantRepository.findAndCount({
      where: search
        ? { name: ILike(`%${search}%`) } // Supondo que `name` seja uma coluna na tabela `Tenant`
        : {},
      take: limit,
      skip,
      order: {
        createdAt: 'DESC', // Ordenação por data de criação, pode ser ajustado
      },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string) {
    return await this.tenantRepository.findOne({
      where: {
        id: tenantId,
      }
    })
  }

  async getTenantDatabase(tenantId: string) {
    const result = await this.tenantDatabaseRepository.findOne({
      where: {
        tenant: {
          id: tenantId
        }
      },
      relations: {
        tenant: true
      }
    })
    if (!result) {
      throw new NotFoundException('Database not found')
    }
    return result
  }

  async getDatabaseByTenantSlug(slug: string) {
    return await this.tenantRepository.findOne({
      where: {
        slug,
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
    })
  }

  async updateDatabase(tenantId: string, databaseDto: TenantDatabaseDto) {
    const tenant = await this.getDatabaseByTenantId(tenantId)
    if (!tenant || !tenant.database) {
      throw new UnprocessableEntityException("Tenant or database not found")
    }
    const { database } = tenant
    database.host = databaseDto.host;
    database.port = databaseDto.port;
    database.setDatabase(databaseDto.database);
    database.setUsername(databaseDto.username);
    database.setPassword((databaseDto.password));
    if (databaseDto.certificate) {
      database.setCertificate(databaseDto.certificate);
    } else {
      database.certificate = null;
    }
    await this.tenantDatabaseRepository.save(database)
  }

  async updateTenant(tenantId: string, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } })
    if (!tenant) {
      throw new UnprocessableEntityException("Tenant not found")
    }

    if (tenant.slug !== updateTenantDto.slug) {
      const tenantExists = await this.findTenantBySlug(updateTenantDto.slug)
      if (!!tenantExists) {
        throw new UnprocessableEntityException("Tenant already exists")
      }
    }
    tenant.name = updateTenantDto.name;
    tenant.slug = updateTenantDto.slug;
    tenant.isEnabled = updateTenantDto.isEnabled;
    await this.tenantRepository.save(tenant)
  }

  private findTenantBySlug(slug: string) {
    return this.tenantRepository.findOneBy({ slug })
  }

  private getDatabaseByTenantId(tenantId: string) {
    return this.tenantRepository.findOne({
      where: {
        id: tenantId,
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
    })
  }
}
