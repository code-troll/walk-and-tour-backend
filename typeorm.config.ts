import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { getDataSourceOptions } from './src/database/typeorm.config';

export default new DataSource({
  ...getDataSourceOptions(),
  migrations: ['src/database/migrations/*.ts'],
});
