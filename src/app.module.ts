import { Module } from '@nestjs/common';
import { TenancyModuleModule } from './modules/tenancy-module/tenancy-module.module';
import { TenantedModulesModule } from './modules/tenanted-modules/tenanted-modules.module';
import { AdminModulesModule } from './modules/admin-modules/admin-modules.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORM_CONFIG } from './database/orm.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(ORM_CONFIG),
    TenancyModuleModule,
    TenantedModulesModule,
    AdminModulesModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
