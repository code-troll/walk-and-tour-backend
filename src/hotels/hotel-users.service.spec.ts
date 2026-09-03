import { ConflictException, NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { EmailProvider } from '../providers/email/email-provider.interface';
import {
  IdentityProvider,
  IdentityUserConflictError,
} from '../providers/identity/identity-provider.interface';
import { HotelUserEntity } from './entities/hotel-user.entity';
import { HotelEntity } from './entities/hotel.entity';
import { HotelUsersService } from './hotel-users.service';

const admin: AuthenticatedAdmin = {
  id: 'admin-1',
  email: 'admin@example.com',
  roleName: 'super_admin',
  status: 'active',
  auth0UserId: 'auth0|admin',
};

const hotel = {
  id: 'hotel-1',
  name: 'Hotel Søborg Strand',
  email: 'reception@example.com',
} as HotelEntity;

describe('HotelUsersService', () => {
  let service: HotelUsersService;
  let hotelsRepository: RepositoryMock<HotelEntity>;
  let hotelUsersRepository: RepositoryMock<HotelUserEntity>;
  let identityProvider: jest.Mocked<IdentityProvider>;
  let emailProvider: jest.Mocked<EmailProvider>;

  beforeEach(() => {
    hotelsRepository = createRepositoryMock<HotelEntity>();
    hotelUsersRepository = createRepositoryMock<HotelUserEntity>();

    identityProvider = {
      createUser: jest.fn().mockResolvedValue({ identityUserId: 'auth0|hotel-1' }),
      createPasswordSetupTicket: jest.fn().mockResolvedValue({
        ticketUrl: 'https://tenant.example/tickets/abc',
        expiresAt: new Date('2026-09-10T00:00:00.000Z'),
      }),
      blockUser: jest.fn().mockResolvedValue(undefined),
      unblockUser: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };

    emailProvider = {
      sendNewsletterConfirmation: jest.fn(),
      sendProposalLink: jest.fn(),
      sendHotelPasswordSetup: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailProvider>;

    service = new HotelUsersService(
      hotelsRepository as never,
      hotelUsersRepository as never,
      identityProvider,
      emailProvider,
    );

    hotelsRepository.findOne.mockResolvedValue(hotel);
    hotelUsersRepository.findOne.mockResolvedValue(null);
    hotelUsersRepository.count.mockResolvedValue(0);
    hotelUsersRepository.save.mockImplementation(async (value: HotelUserEntity) => ({
      ...value,
      id: value.id ?? 'user-1',
    }));
  });

  describe('findByHotelIdOrThrow', () => {
    it('reports a hotel without an access user as not found', async () => {
      hotelUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.findByHotelIdOrThrow('hotel-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the access user when one exists', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        hotelId: 'hotel-1',
        username: 'hotel-soeborg-strand',
        email: 'reception@example.com',
        status: 'invited',
        lastLoginAt: null,
        audit: {},
      } as never);

      await expect(service.findByHotelIdOrThrow('hotel-1')).resolves.toMatchObject({
        username: 'hotel-soeborg-strand',
      });
    });
  });

  describe('create', () => {
    it('derives a Danish-transliterated username and invites the hotel', async () => {
      const user = await service.create('hotel-1', admin);

      expect(user.username).toBe('hotel-soeborg-strand');
      expect(identityProvider.createUser).toHaveBeenCalledWith({
        username: 'hotel-soeborg-strand',
        email: 'reception@example.com',
        displayName: 'Hotel Søborg Strand',
      });
      expect(emailProvider.sendHotelPasswordSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'reception@example.com',
          username: 'hotel-soeborg-strand',
          setupUrl: 'https://tenant.example/tickets/abc',
          isResend: false,
        }),
      );
      expect(user.status).toBe('invited');
    });

    it('walks past a username the database already holds', async () => {
      hotelUsersRepository.count.mockImplementation(async ({ where }: never) =>
        (where as { username: string }).username === 'hotel-soeborg-strand' ? 1 : 0,
      );

      const user = await service.create('hotel-1', admin);

      expect(user.username).toBe('hotel-soeborg-strand-2');
    });

    it('removes the local row when the identity provider refuses the username', async () => {
      identityProvider.createUser.mockRejectedValue(
        new IdentityUserConflictError('Auth0 already has that user.'),
      );

      await expect(service.create('hotel-1', admin)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(hotelUsersRepository.delete).toHaveBeenCalledWith({ id: 'user-1' });
      expect(emailProvider.sendHotelPasswordSetup).not.toHaveBeenCalled();
    });

    it('removes the local row when the identity provider fails for any other reason', async () => {
      identityProvider.createUser.mockRejectedValue(new Error('network down'));

      await expect(service.create('hotel-1', admin)).rejects.toThrow('network down');

      expect(hotelUsersRepository.delete).toHaveBeenCalledWith({ id: 'user-1' });
    });

    it('refuses a second access user for the same hotel', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({ id: 'user-1' } as never);

      await expect(service.create('hotel-1', admin)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(identityProvider.createUser).not.toHaveBeenCalled();
    });

    it('reports a missing hotel as not found', async () => {
      hotelsRepository.findOne.mockResolvedValue(null);

      await expect(service.create('hotel-404', admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('resendInvitation', () => {
    it('issues a fresh ticket and marks the email as a resend', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        hotelId: 'hotel-1',
        username: 'hotel-soeborg-strand',
        email: 'reception@example.com',
        identityUserId: 'auth0|hotel-1',
        status: 'invited',
        lastLoginAt: null,
      } as never);

      await service.resendInvitation('hotel-1', admin);

      expect(identityProvider.createPasswordSetupTicket).toHaveBeenCalled();
      expect(emailProvider.sendHotelPasswordSetup).toHaveBeenCalledWith(
        expect.objectContaining({ isResend: true }),
      );
    });

    it('refuses to send a link to a disabled user', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        status: 'disabled',
        identityUserId: 'auth0|hotel-1',
      } as never);

      await expect(service.resendInvitation('hotel-1', admin)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(emailProvider.sendHotelPasswordSetup).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('blocks the identity when disabling', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        identityUserId: 'auth0|hotel-1',
        status: 'active',
        lastLoginAt: new Date(),
      } as never);

      const user = await service.setEnabled('hotel-1', false, admin);

      expect(identityProvider.blockUser).toHaveBeenCalledWith('auth0|hotel-1');
      expect(user.status).toBe('disabled');
    });

    it('returns a user that never signed in to invited, not active', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        identityUserId: 'auth0|hotel-1',
        status: 'disabled',
        lastLoginAt: null,
      } as never);

      const user = await service.setEnabled('hotel-1', true, admin);

      expect(identityProvider.unblockUser).toHaveBeenCalledWith('auth0|hotel-1');
      expect(user.status).toBe('invited');
    });

    it('restores a user that had signed in to active', async () => {
      hotelUsersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        identityUserId: 'auth0|hotel-1',
        status: 'disabled',
        lastLoginAt: new Date('2026-08-01T00:00:00.000Z'),
      } as never);

      const user = await service.setEnabled('hotel-1', true, admin);

      expect(user.status).toBe('active');
    });
  });
});
