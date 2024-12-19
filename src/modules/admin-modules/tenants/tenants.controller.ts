import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, HttpCode, Query, Put } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantPaginationDto } from './dto/tenant-pagination.dto';
import { TenantDatabaseDto } from './dto/tenant-database.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.createTenant(createTenantDto);
  }

  @Get()
  findAll(@Query() paginationDto: TenantPaginationDto) {
    return this.tenantsService.findAllWithPagination(paginationDto);
  }

  @Get(':tenantId')
  findOne(@Param('tenantId') tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Put(':tenantId')
  update(@Param('tenantId') tenantId: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.updateTenant(tenantId, updateTenantDto);
  }

  @Put(':tenantId/database')
  updateDatabase(@Param('tenantId') tenantId: string, @Body() tenantDatabaseDto: TenantDatabaseDto) {
    return this.tenantsService.updateDatabase(tenantId, tenantDatabaseDto);
  }

  @Post(':tenantId/test-connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  async testConnection(@Param('tenantId') tenantId: string) {
    await this.tenantsService.testTenantDatabaseConnection(tenantId)
  }

  @Post(':tenantId/run-migration')
  @HttpCode(HttpStatus.NO_CONTENT)
  async runMigration(@Param('tenantId') tenantId: string) {
    await this.tenantsService.migrateTenantDatabase(tenantId)
  }

  @Get(':tenantId/database')
  @HttpCode(HttpStatus.OK)
  async tenantDatabase(@Param('tenantId') tenantId: string) {
    const database = await this.tenantsService.getTenantDatabase(tenantId)
    return {
      "host": database.host,
      "port": database.port,
      "createdAt": database.createdAt,
      "updatedAt": database.updatedAt,
      "migratedAt": database.migratedAt,
    }
  }
}
