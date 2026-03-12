import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoleEntity } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>,
  ) {}

  async findAll(): Promise<RoleEntity[]> {
    return this.rolesRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async exists(name: string): Promise<boolean> {
    return (await this.rolesRepository.count({ where: { name } })) > 0;
  }
}
