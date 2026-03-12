import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagEntity } from './tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagsRepository: Repository<TagEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
  ) {}

  async findAll(): Promise<TagEntity[]> {
    return this.tagsRepository.find({
      order: {
        key: 'ASC',
      },
    });
  }

  async create(dto: CreateTagDto): Promise<TagEntity> {
    const existing = await this.tagsRepository.findOne({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Tag "${dto.key}" already exists.`);
    }

    await this.validateLabels(dto.labels);

    const tag = this.tagsRepository.create(dto);

    return this.tagsRepository.save(tag);
  }

  async update(key: string, dto: UpdateTagDto): Promise<TagEntity> {
    const tag = await this.tagsRepository.findOne({
      where: { key },
    });

    if (!tag) {
      throw new NotFoundException(`Tag "${key}" was not found.`);
    }

    if (dto.labels) {
      await this.validateLabels(dto.labels);
      tag.labels = dto.labels;
    }

    return this.tagsRepository.save(tag);
  }

  async findByKeys(keys: string[]): Promise<TagEntity[]> {
    if (keys.length === 0) {
      return [];
    }

    return this.tagsRepository.findBy(
      keys.map((key) => ({ key })),
    );
  }

  private async validateLabels(labels: Record<string, string>): Promise<void> {
    const entries = Object.entries(labels);

    if (entries.length === 0) {
      throw new BadRequestException('Tag labels cannot be empty.');
    }

    const languages = await this.languagesRepository.find();
    const supportedCodes = new Set(languages.map((language) => language.code));

    for (const [code, value] of entries) {
      if (!supportedCodes.has(code)) {
        throw new BadRequestException(`Tag label locale "${code}" is not registered.`);
      }

      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new BadRequestException(`Tag label for "${code}" must be a non-empty string.`);
      }
    }
  }
}
