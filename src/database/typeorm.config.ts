import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

import { AdminUserEntity } from '../admin-users/admin-user.entity';
import { RoleEntity } from '../admin-users/role.entity';
import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { TourItineraryStopEntity } from '../tours/entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from '../tours/entities/tour-translation.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { getDatabaseConfig } from '../shared/config/database.config';

export function getTypeOrmOptions(): TypeOrmModuleOptions {
  const config = getDatabaseConfig();

  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: [
      RoleEntity,
      AdminUserEntity,
      LanguageEntity,
      TagEntity,
      TourEntity,
      TourItineraryStopEntity,
      TourTranslationEntity,
    ],
    migrations: ['dist/database/migrations/*.js'],
    synchronize: false,
  };
}

export function getDataSourceOptions(): DataSourceOptions {
  return getTypeOrmOptions() as DataSourceOptions;
}
