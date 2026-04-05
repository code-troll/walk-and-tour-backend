import { ProposalsService } from './proposals.service';
import { ProposalEntity } from './entities/proposal.entity';
import { ProposalVersionEntity } from './entities/proposal-version.entity';

describe('ProposalsService.removeVersion auto-unpublish', () => {
  let service: ProposalsService;
  let mockProposalsRepo: any;
  let mockVersionsRepo: any;

  const actor = { id: 'admin-1', email: 'admin@test.com', roleName: 'super_admin' as const, status: 'active' as const, auth0UserId: 'auth0|123' };

  beforeEach(() => {
    mockProposalsRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockVersionsRepo = {
      remove: jest.fn(),
      count: jest.fn(),
    };

    service = new ProposalsService(
      mockProposalsRepo,
      mockVersionsRepo,
      {} as any, // proposalMediaRepository
      {} as any, // mediaAssetsRepository
      {} as any, // storageService
      {} as any, // emailProvider
    );
  });

  const buildProposal = (overrides: Partial<ProposalEntity> = {}): ProposalEntity => ({
    id: 'proposal-1',
    hash: 'abc123',
    language: 'en',
    recipientName: null,
    recipientEmail: null,
    acceptanceStatus: 'pending',
    publicationStatus: 'published',
    expiresAt: null,
    notes: null,
    versions: [
      { id: 'version-1', proposalId: 'proposal-1', orderIndex: 0, title: 'V1' } as ProposalVersionEntity,
    ],
    mediaItems: [],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('auto-unpublishes when last version is removed from a published proposal', async () => {
    const proposal = buildProposal({ publicationStatus: 'published' });
    mockProposalsRepo.findOne.mockResolvedValue(proposal);
    mockVersionsRepo.remove.mockResolvedValue(undefined);
    mockVersionsRepo.count.mockResolvedValue(0); // no versions remain after delete

    await service.removeVersion('proposal-1', 'version-1', actor);

    expect(mockVersionsRepo.remove).toHaveBeenCalledWith(proposal.versions[0]);
    expect(mockVersionsRepo.count).toHaveBeenCalledWith({ where: { proposalId: 'proposal-1' } });
    expect(mockProposalsRepo.update).toHaveBeenCalledWith(
      { id: 'proposal-1' },
      expect.objectContaining({ publicationStatus: 'unpublished', updatedBy: 'admin-1' }),
    );
  });

  it('does not change publication status when versions remain', async () => {
    const proposal = buildProposal({ publicationStatus: 'published' });
    mockProposalsRepo.findOne.mockResolvedValue(proposal);
    mockVersionsRepo.remove.mockResolvedValue(undefined);
    mockVersionsRepo.count.mockResolvedValue(1); // one version still remains

    await service.removeVersion('proposal-1', 'version-1', actor);

    expect(mockProposalsRepo.update).toHaveBeenCalledWith(
      { id: 'proposal-1' },
      { updatedBy: 'admin-1' },
    );
  });

  it('does not change publication status when proposal is already unpublished', async () => {
    const proposal = buildProposal({ publicationStatus: 'unpublished' });
    mockProposalsRepo.findOne.mockResolvedValue(proposal);
    mockVersionsRepo.remove.mockResolvedValue(undefined);
    mockVersionsRepo.count.mockResolvedValue(0);

    await service.removeVersion('proposal-1', 'version-1', actor);

    // Should just touch, not set publicationStatus
    expect(mockProposalsRepo.update).toHaveBeenCalledWith(
      { id: 'proposal-1' },
      { updatedBy: 'admin-1' },
    );
  });
});
