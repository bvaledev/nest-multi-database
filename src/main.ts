import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { tenancyMiddleware } from './modules/tenancy-module/tenancy.middleware';
import { TenantConnection } from './modules/tenancy-module/tenancy-connection';
import AppDataSource from './database/admin.datasource'
import { ValidationPipe } from '@nestjs/common';
import { TenantDatabase } from './modules/admin-modules/tenants/entities/tenant-database.entity';

async function migrateTenanted() {
  console.log(`--------------------------------------------------------------------------------`)
  console.log(`---------------------------- Start Migrate Tenanted ----------------------------`)
  console.log(`--------------------------------------------------------------------------------`)
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
  }
  const tenantDatabaseRepo = AppDataSource.getRepository(TenantDatabase)
  const databases = await tenantDatabaseRepo.find({
    select: {
      id: true,
      host: true,
      port: true,
      database: true,
      username: true,
      password: true,
      certificate: true,
      tenant: {
        slug: true
      }
    },
    relations: {
      tenant: true
    }
  })
  const tenantManager = TenantConnection.getInstance()
  for (let i = 0; i < databases.length; i += 1) {
    console.log(`--------------------------------------------------------------------------------`)
    const database = databases[i];
    console.log(`Verifying tenant ${database.tenant.slug} connection`)
    const connection = await tenantManager.createConnection(database)
    if (connection) {
      console.log(`Migrating tenant ${database.tenant.slug} ...`)
      await connection.runMigrations()
      console.log(`Migration of tenant ${database.tenant.slug} finished!`)
      await tenantDatabaseRepo.update(database.id, { migratedAt: new Date() })
    } else {
      console.error(`Invalid tenant ${database.tenant.slug} connection`)
    }
  }
  await tenantManager.closeAllConnections()
  await AppDataSource.destroy();
  console.log(`--------------------------------------------------------------------------------`)
  console.log(`--------------------------- Finish Migrate Tenanted ----------------------------`)
  console.log(`--------------------------------------------------------------------------------`)
}

async function migrateAdmin() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
  }
  await AppDataSource.runMigrations()
  await AppDataSource.destroy();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(tenancyMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await migrateAdmin()
  await migrateTenanted()

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
