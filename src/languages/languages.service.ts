import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LanguageEntity } from './language.entity';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
  ) {}

  async findAll(): Promise<LanguageEntity[]> {
    return this.languagesRepository.find({
      order: {
        sortOrder: 'ASC',
        code: 'ASC',
      },
    });
  }

  async create(dto: CreateLanguageDto): Promise<LanguageEntity> {
    const existing = await this.languagesRepository.findOne({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Language "${dto.code}" already exists.`);
    }

    const language = this.languagesRepository.create({
      code: dto.code,
      name: dto.name,
      isEnabled: dto.isEnabled ?? true,
      sortOrder: dto.sortOrder,
    });

    return this.languagesRepository.save(language);
  }

  async update(code: string, dto: UpdateLanguageDto): Promise<LanguageEntity> {
    const language = await this.languagesRepository.findOne({
      where: { code },
    });

    if (!language) {
      throw new NotFoundException(`Language "${code}" was not found.`);
    }

    Object.assign(language, dto);

    return this.languagesRepository.save(language);
  }
}
