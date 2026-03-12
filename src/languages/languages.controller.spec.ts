import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';

describe('LanguagesController', () => {
  let controller: LanguagesController;
  let languagesService: jest.Mocked<LanguagesService>;

  beforeEach(() => {
    languagesService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<LanguagesService>;

    controller = new LanguagesController(languagesService);
  });

  it('delegates list requests', async () => {
    await controller.findAll();
    expect(languagesService.findAll).toHaveBeenCalled();
  });

  it('delegates create requests', async () => {
    const dto = { code: 'fr', name: 'French', sortOrder: 4 };
    await controller.create(dto);
    expect(languagesService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update requests', async () => {
    const dto = { isEnabled: false };
    await controller.update('en', dto);
    expect(languagesService.update).toHaveBeenCalledWith('en', dto);
  });
});
