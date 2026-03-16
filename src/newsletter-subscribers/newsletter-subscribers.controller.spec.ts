import { BadRequestException, NotFoundException } from '@nestjs/common';

import { NewsletterSubscribersController } from './newsletter-subscribers.controller';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';

describe('NewsletterSubscribersController', () => {
  let controller: NewsletterSubscribersController;
  let newsletterSubscribersService: jest.Mocked<NewsletterSubscribersService>;

  beforeEach(() => {
    process.env.NEWSLETTER_PUBLIC_APP_BASE_URL = 'https://www.walkandtour.test';
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
    const response = createResponseMock();

    await controller.confirmByLink({ token: 'confirmation-token' }, response);

    expect(newsletterSubscribersService.confirm).toHaveBeenCalledWith(
      'confirmation-token',
    );
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://www.walkandtour.test/newsletter/confirm?status=success',
    );
  });

  it('redirects invalid confirmation tokens to the public error page', async () => {
    const response = createResponseMock();

    newsletterSubscribersService.confirm.mockRejectedValue(
      new NotFoundException('Newsletter confirmation token is invalid.'),
    );

    await controller.confirmByLink({ token: 'confirmation-token' }, response);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://www.walkandtour.test/newsletter/confirm?status=error&reason=invalid_token',
    );
  });

  it('redirects invalid confirmation states to the public error page', async () => {
    const response = createResponseMock();

    newsletterSubscribersService.confirm.mockRejectedValue(
      new BadRequestException(
        'Subscriber "subscriber@example.com" is not awaiting confirmation.',
      ),
    );

    await controller.confirmByLink({ token: 'confirmation-token' }, response);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://www.walkandtour.test/newsletter/confirm?status=error&reason=invalid_state',
    );
  });

  it('delegates public unsubscribe requests', async () => {
    await controller.unsubscribe({ token: 'unsubscribe-token' });

    expect(newsletterSubscribersService.unsubscribe).toHaveBeenCalledWith(
      'unsubscribe-token',
    );
  });

  it('delegates public unsubscribe link requests', async () => {
    const response = createResponseMock();

    await controller.unsubscribeByLink({ token: 'unsubscribe-token' }, response);

    expect(newsletterSubscribersService.unsubscribe).toHaveBeenCalledWith(
      'unsubscribe-token',
    );
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://www.walkandtour.test/newsletter/unsubscribe?status=success',
    );
  });

  it('redirects invalid unsubscribe tokens to the public error page', async () => {
    const response = createResponseMock();

    newsletterSubscribersService.unsubscribe.mockRejectedValue(
      new NotFoundException('Newsletter unsubscribe token is invalid.'),
    );

    await controller.unsubscribeByLink({ token: 'unsubscribe-token' }, response);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://www.walkandtour.test/newsletter/unsubscribe?status=error&reason=invalid_token',
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

function createResponseMock(): { redirect: jest.Mock } {
  return {
    redirect: jest.fn(),
  };
}
