import { NewsletterSubscribersController } from './newsletter-subscribers.controller';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';

describe('NewsletterSubscribersController', () => {
  let controller: NewsletterSubscribersController;
  let newsletterSubscribersService: jest.Mocked<NewsletterSubscribersService>;

  beforeEach(() => {
    newsletterSubscribersService = {
      subscribe: jest.fn(),
      confirm: jest.fn(),
      unsubscribe: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      exportCsv: jest.fn(),
    } as unknown as jest.Mocked<NewsletterSubscribersService>;

    controller = new NewsletterSubscribersController(newsletterSubscribersService);
  });

  it('delegates public subscribe requests', async () => {
    const dto = { email: 'subscriber@example.com' };

    await controller.subscribe(dto as never);

    expect(newsletterSubscribersService.subscribe).toHaveBeenCalledWith(dto);
  });

  it('delegates public confirmation requests', async () => {
    await controller.confirm({ token: 'confirmation-token' });

    expect(newsletterSubscribersService.confirm).toHaveBeenCalledWith(
      'confirmation-token',
    );
  });

  it('delegates public confirmation link requests', async () => {
    await controller.confirmByLink({ token: 'confirmation-token' });

    expect(newsletterSubscribersService.confirm).toHaveBeenCalledWith(
      'confirmation-token',
    );
  });

  it('delegates public unsubscribe requests', async () => {
    await controller.unsubscribe({ token: 'unsubscribe-token' });

    expect(newsletterSubscribersService.unsubscribe).toHaveBeenCalledWith(
      'unsubscribe-token',
    );
  });

  it('delegates public unsubscribe link requests', async () => {
    await controller.unsubscribeByLink({ token: 'unsubscribe-token' });

    expect(newsletterSubscribersService.unsubscribe).toHaveBeenCalledWith(
      'unsubscribe-token',
    );
  });

  it('delegates admin list requests', async () => {
    const query = { q: 'subscriber', status: 'subscribed', page: 1, limit: 50 };

    await controller.findAll(query as never);

    expect(newsletterSubscribersService.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates admin detail requests', async () => {
    await controller.findOne('0f34b359-4a4e-4f2c-9ef0-77c9a9f87901');

    expect(newsletterSubscribersService.findOne).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
    );
  });

  it('delegates admin export requests', async () => {
    const query = { status: 'subscribed' };

    await controller.exportCsv(query as never);

    expect(newsletterSubscribersService.exportCsv).toHaveBeenCalledWith(query);
  });
});
