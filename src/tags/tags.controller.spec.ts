import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let tagsService: jest.Mocked<TagsService>;

  beforeEach(() => {
    tagsService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<TagsService>;

    controller = new TagsController(tagsService);
  });

  it('delegates list requests', async () => {
    await controller.findAll();
    expect(tagsService.findAll).toHaveBeenCalled();
  });

  it('delegates create requests', async () => {
    const dto = { key: 'history', labels: { en: 'History' } };
    await controller.create(dto);
    expect(tagsService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update requests', async () => {
    const dto = { labels: { en: 'Updated' } };
    await controller.update('history', dto);
    expect(tagsService.update).toHaveBeenCalledWith('history', dto);
  });
});
