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
  let dataSource: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    tagsRepository = createRepositoryMock<TagEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    dataSource = {
      transaction: jest.fn(),
    };
    service = new TagsService(
      tagsRepository as never,
      languagesRepository as never,
      dataSource as never,
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

  it('rejects labels longer than 100 characters', async () => {
    tagsRepository.findOne.mockResolvedValue(null);
    languagesRepository.find.mockResolvedValue([{ code: 'en' }] as LanguageEntity[]);

    await expect(
      service.create({
        key: 'history',
        labels: {
          en: 'x'.repeat(101),
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects updates for missing tags', async () => {
    tagsRepository.findOne.mockResolvedValue(null);

    await expect(service.update('missing', { labels: { en: 'Missing' } })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes tag associations from tours and blog posts before deleting the tag', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({ key: 'history' } as TagEntity),
      query: jest.fn(),
      delete: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (callback) => callback(manager));

    await service.remove('history');

    expect(manager.findOne).toHaveBeenCalledWith(TagEntity, {
      where: { key: 'history' },
    });
    expect(manager.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM "tour_tags"'),
      ['history'],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM "blog_post_tags"'),
      ['history'],
    );
    expect(manager.delete).toHaveBeenCalledWith(TagEntity, { key: 'history' });
  });

  it('rejects delete requests for missing tags', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn(),
      delete: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (callback) => callback(manager));

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.query).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });
});
