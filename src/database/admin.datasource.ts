import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { ORM_CONFIG } from './orm.config';
config();

const AppDataSource = new DataSource({
  ...ORM_CONFIG as DataSourceOptions
});

AppDataSource.initialize()

export default AppDataSource;