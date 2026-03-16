import { ADMIN_ROLES_KEY } from '../admin-auth/decorators/admin-roles.decorator';
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

  it('allows editors to list languages but keeps writes super-admin only', () => {
    expect(
      Reflect.getMetadata(ADMIN_ROLES_KEY, LanguagesController.prototype.findAll),
    ).toEqual(['super_admin', 'editor']);
    expect(
      Reflect.getMetadata(ADMIN_ROLES_KEY, LanguagesController.prototype.create),
    ).toEqual(['super_admin']);
    expect(
      Reflect.getMetadata(ADMIN_ROLES_KEY, LanguagesController.prototype.update),
    ).toEqual(['super_admin']);
  });
});
