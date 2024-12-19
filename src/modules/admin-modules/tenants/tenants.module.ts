import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantDatabase } from './entities/tenant-database.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantDatabase])],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule { }
