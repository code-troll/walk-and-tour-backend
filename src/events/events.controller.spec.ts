import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<EventsService>;

  const admin = { id: 'admin-1' };

  beforeEach(() => {
    eventsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      remove: jest.fn(),
      listCalendar: jest.fn(),
      listDayNotes: jest.fn(),
      upsertDayNote: jest.fn(),
      removeDayNote: jest.fn(),
      listOccurrences: jest.fn(),
      confirmOccurrence: jest.fn(),
      updateOccurrence: jest.fn(),
      cancelOccurrence: jest.fn(),
      removeOccurrence: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    controller = new EventsController(eventsService);
  });

  it('delegates admin list', async () => {
    await controller.findAllAdmin();
    expect(eventsService.findAll).toHaveBeenCalled();
  });

  it('delegates find one by UUID', async () => {
    await controller.findOneAdmin('event-1');
    expect(eventsService.findOne).toHaveBeenCalledWith('event-1');
  });

  it('delegates create with the authenticated admin', async () => {
    const dto = { language: 'en' };
    await controller.createAdmin(dto as never, admin as never);
    expect(eventsService.create).toHaveBeenCalledWith(dto, admin);
  });

  it('delegates update with the authenticated admin', async () => {
    const dto = { type: 'paid' };
    await controller.updateAdmin('event-1', dto as never, admin as never);
    expect(eventsService.update).toHaveBeenCalledWith('event-1', dto, admin);
  });

  it('delegates cancel with the authenticated admin', async () => {
    await controller.cancelAdmin('event-1', admin as never);
    expect(eventsService.cancel).toHaveBeenCalledWith('event-1', admin);
  });

  it('delegates delete', async () => {
    await controller.removeAdmin('event-1');
    expect(eventsService.remove).toHaveBeenCalledWith('event-1');
  });

  it('delegates the calendar feed with the window', async () => {
    await controller.listCalendar({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T00:00:00.000Z',
    });
    expect(eventsService.listCalendar).toHaveBeenCalledWith(
      '2026-07-01T00:00:00.000Z',
      '2026-07-31T00:00:00.000Z',
    );
  });

  it('delegates occurrence listing with the window', async () => {
    await controller.listOccurrences('event-1', {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T00:00:00.000Z',
    });
    expect(eventsService.listOccurrences).toHaveBeenCalledWith(
      'event-1',
      '2026-07-01T00:00:00.000Z',
      '2026-07-31T00:00:00.000Z',
    );
  });

  it('delegates occurrence confirmation with the authenticated admin', async () => {
    const dto = { date: '2026-07-01T10:00:00.000Z' };
    await controller.confirmOccurrence('event-1', dto as never, admin as never);
    expect(eventsService.confirmOccurrence).toHaveBeenCalledWith('event-1', dto, admin);
  });

  it('delegates occurrence update with the authenticated admin', async () => {
    const dto = { note: 'changed' };
    await controller.updateOccurrence('event-1', 'occ-1', dto as never, admin as never);
    expect(eventsService.updateOccurrence).toHaveBeenCalledWith(
      'event-1',
      'occ-1',
      dto,
      admin,
    );
  });

  it('delegates occurrence cancellation with the authenticated admin', async () => {
    await controller.cancelOccurrence('event-1', 'occ-1', admin as never);
    expect(eventsService.cancelOccurrence).toHaveBeenCalledWith(
      'event-1',
      'occ-1',
      admin,
    );
  });

  it('delegates occurrence deletion', async () => {
    await controller.removeOccurrence('event-1', 'occ-1');
    expect(eventsService.removeOccurrence).toHaveBeenCalledWith('event-1', 'occ-1');
  });

  it('marks event delete requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        EventsController.prototype.removeAdmin,
      ),
    ).toBe(204);
  });

  it('marks occurrence delete requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        EventsController.prototype.removeOccurrence,
      ),
    ).toBe(204);
  });
});
