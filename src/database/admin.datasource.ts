import { DataSource, DataSourceOptions } from 'typeorm';
import { ORM_CONFIG } from './orm.config';

const AppDataSource = new DataSource({
  ...ORM_CONFIG as DataSourceOptions
});

AppDataSource.initialize()

export default AppDataSource;