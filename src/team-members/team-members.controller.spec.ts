import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

import { PublicTeamMembersService } from './public-team-members.service';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';

describe('TeamMembersController', () => {
  let controller: TeamMembersController;
  let teamMembersService: jest.Mocked<TeamMembersService>;
  let publicTeamMembersService: jest.Mocked<PublicTeamMembersService>;

  beforeEach(() => {
    teamMembersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      setPhoto: jest.fn(),
      createTranslation: jest.fn(),
      updateTranslation: jest.fn(),
      deleteTranslation: jest.fn(),
    } as unknown as jest.Mocked<TeamMembersService>;
    publicTeamMembersService = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<PublicTeamMembersService>;

    controller = new TeamMembersController(teamMembersService, publicTeamMembersService);
  });

  it('delegates admin list', async () => {
    await controller.findAllAdmin();

    expect(teamMembersService.findAll).toHaveBeenCalled();
  });

  it('delegates admin find one by UUID', async () => {
    await controller.findOneAdmin('member-1');

    expect(teamMembersService.findOne).toHaveBeenCalledWith('member-1');
  });

  it('delegates admin create with the authenticated admin', async () => {
    const dto = { name: 'Ayelen Salazar', mediaId: 'media-1' };
    const admin = { id: 'admin-1' };

    await controller.createAdmin(dto as never, admin as never);

    expect(teamMembersService.create).toHaveBeenCalledWith(dto, admin);
  });

  it('delegates admin update with the authenticated admin', async () => {
    const dto = { isPublished: true };
    const admin = { id: 'admin-1' };

    await controller.updateAdmin('member-1', dto as never, admin as never);

    expect(teamMembersService.update).toHaveBeenCalledWith('member-1', dto, admin);
  });

  it('delegates admin delete', async () => {
    await controller.removeAdmin('member-1');

    expect(teamMembersService.remove).toHaveBeenCalledWith('member-1');
  });

  it('delegates photo assignment with the authenticated admin', async () => {
    const dto = { mediaId: 'media-1' };
    const admin = { id: 'admin-1' };

    await controller.setPhoto('member-1', dto as never, admin as never);

    expect(teamMembersService.setPhoto).toHaveBeenCalledWith('member-1', dto, admin);
  });

  it('delegates translation creation with the authenticated admin', async () => {
    const dto = { languageCode: 'en', role: 'Founder' };
    const admin = { id: 'admin-1' };

    await controller.createTranslation('member-1', dto as never, admin as never);

    expect(teamMembersService.createTranslation).toHaveBeenCalledWith(
      'member-1',
      dto,
      admin,
    );
  });

  it('delegates translation updates with the authenticated admin', async () => {
    const dto = { role: 'Updated Role' };
    const admin = { id: 'admin-1' };

    await controller.updateTranslation('member-1', 'en', dto as never, admin as never);

    expect(teamMembersService.updateTranslation).toHaveBeenCalledWith(
      'member-1',
      'en',
      dto,
      admin,
    );
  });

  it('delegates translation deletion with the authenticated admin', async () => {
    const admin = { id: 'admin-1' };

    await controller.deleteTranslation('member-1', 'en', admin as never);

    expect(teamMembersService.deleteTranslation).toHaveBeenCalledWith(
      'member-1',
      'en',
      admin,
    );
  });

  it('delegates public listing by locale', async () => {
    await controller.findAllPublic({ locale: 'en' });

    expect(publicTeamMembersService.findAll).toHaveBeenCalledWith('en');
  });

  it('marks delete requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TeamMembersController.prototype.removeAdmin,
      ),
    ).toBe(204);
  });

  it('marks translation delete requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TeamMembersController.prototype.deleteTranslation,
      ),
    ).toBe(204);
  });
});
