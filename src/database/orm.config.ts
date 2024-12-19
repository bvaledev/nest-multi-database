
import { join } from 'path';
import { SnakeNamingStrategy } from './utils/snake-naming.strategy';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
config();

const configService = new ConfigService();

const cert = configService.getOrThrow("DB_CERTIFICATE")
export const ORM_CONFIG: DataSourceOptions = {
  type: 'postgres',
  host: configService.getOrThrow("DB_HOST"),
  port: configService.getOrThrow<number>("DB_PORT"),
  username: configService.getOrThrow("DB_USERNAME"),
  password: configService.getOrThrow("DB_PASSWORD"),
  database: configService.getOrThrow("DB_DATABASE"),
  logging: configService.getOrThrow<boolean>("DB_LOGGING"),
  ssl: cert ? { ca: cert } : undefined,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [join(__dirname, '..', './modules/admin-modules/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/admin/*{.ts,.js}')],
}

export const TENANT_ORM_CONFIG: DataSourceOptions = {
  type: 'postgres',
  logging: configService.getOrThrow<boolean>("DB_LOGGING"),
  namingStrategy: new SnakeNamingStrategy(),
  entities: [join(__dirname, '..', './modules/tenanted-modules/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/tenanted/*{.ts,.js}')],
}
