import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from './tag.entity';
import { TagsService } from './tags.service';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';

describe('TagsService', () => {
  let service: TagsService;
  let tagsRepository: RepositoryMock<TagEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;

  beforeEach(() => {
    tagsRepository = createRepositoryMock<TagEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    service = new TagsService(
      tagsRepository as never,
      languagesRepository as never,
    );
  });

  it('creates a tag when locale labels are valid', async () => {
    tagsRepository.findOne.mockResolvedValue(null);
    tagsRepository.create.mockImplementation((value) => value);
    languagesRepository.find.mockResolvedValue([
      { code: 'en' },
      { code: 'es' },
    ] as LanguageEntity[]);

    await service.create({
      key: 'history',
      labels: {
        en: 'History',
        es: 'Historia',
      },
    });

    expect(tagsRepository.create).toHaveBeenCalledWith({
      key: 'history',
      labels: {
        en: 'History',
        es: 'Historia',
      },
    });
    expect(tagsRepository.save).toHaveBeenCalled();
  });

  it('rejects duplicate tag keys', async () => {
    tagsRepository.findOne.mockResolvedValue({ key: 'history' } as TagEntity);

    await expect(
      service.create({
        key: 'history',
        labels: { en: 'History' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects labels for unregistered locales', async () => {
    tagsRepository.findOne.mockResolvedValue(null);
    languagesRepository.find.mockResolvedValue([{ code: 'en' }] as LanguageEntity[]);

    await expect(
      service.create({
        key: 'history',
        labels: { it: 'Storia' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects updates for missing tags', async () => {
    tagsRepository.findOne.mockResolvedValue(null);

    await expect(service.update('missing', { labels: { en: 'Missing' } })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
