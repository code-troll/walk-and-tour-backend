import { ConflictException, NotFoundException } from '@nestjs/common';

import { LanguagesService } from './languages.service';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from './language.entity';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let languagesRepository: RepositoryMock<LanguageEntity>;

  beforeEach(() => {
    languagesRepository = createRepositoryMock<LanguageEntity>();
    service = new LanguagesService(languagesRepository as never);
  });

  it('returns languages ordered by sort order and code', async () => {
    const languages = [{ code: 'en' }, { code: 'es' }] as LanguageEntity[];
    languagesRepository.find.mockResolvedValue(languages);

    await expect(service.findAll()).resolves.toEqual(languages);
    expect(languagesRepository.find).toHaveBeenCalledWith({
      order: {
        sortOrder: 'ASC',
        code: 'ASC',
      },
    });
  });

  it('creates a language with default enabled state', async () => {
    languagesRepository.findOne.mockResolvedValue(null);
    languagesRepository.create.mockImplementation((value) => value);

    await service.create({
      code: 'fr',
      name: 'French',
      sortOrder: 4,
    });

    expect(languagesRepository.create).toHaveBeenCalledWith({
      code: 'fr',
      name: 'French',
      isEnabled: true,
      sortOrder: 4,
    });
    expect(languagesRepository.save).toHaveBeenCalled();
  });

  it('rejects duplicate language codes', async () => {
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);

    await expect(
      service.create({
        code: 'en',
        name: 'English',
        sortOrder: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects updates for missing languages', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(service.update('da', { isEnabled: false })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
