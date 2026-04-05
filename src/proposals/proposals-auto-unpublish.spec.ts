import { ProposalsService } from './proposals.service';
import { ProposalEntity } from './entities/proposal.entity';
import { ProposalVersionEntity } from './entities/proposal-version.entity';

describe('ProposalsService.removeVersion auto-unpublish', () => {
  let service: ProposalsService;
  let mockProposalsRepo: any;
  let mockVersionsRepo: any;
  let mockQueryBuilderExecute: jest.Mock;
  let mockQueryBuilderSet: jest.Mock;

  const actor = { id: 'admin-1', email: 'admin@test.com', roleName: 'super_admin' as const, status: 'active' as const, auth0UserId: 'auth0|123' };

  beforeEach(() => {
    mockQueryBuilderExecute = jest.fn().mockResolvedValue(undefined);
    mockQueryBuilderSet = jest.fn();

    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: (...args: unknown[]) => { mockQueryBuilderSet(...args); return mockQueryBuilder; },
      where: jest.fn().mockReturnThis(),
      execute: mockQueryBuilderExecute,
    };

    mockProposalsRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };
    mockVersionsRepo = {
      remove: jest.fn(),
      count: jest.fn(),
    };

    service = new ProposalsService(
      mockProposalsRepo,
      mockVersionsRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
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
    mockVersionsRepo.count.mockResolvedValue(0);

    await service.removeVersion('proposal-1', 'version-1', actor);

    expect(mockVersionsRepo.remove).toHaveBeenCalledWith(proposal.versions[0]);
    expect(mockVersionsRepo.count).toHaveBeenCalledWith({ where: { proposalId: 'proposal-1' } });
    expect(mockQueryBuilderSet).toHaveBeenCalledWith({
      publicationStatus: 'unpublished',
      updatedBy: 'admin-1',
    });
    expect(mockQueryBuilderExecute).toHaveBeenCalled();
  });

  it('does not change publication status when versions remain', async () => {
    const proposal = buildProposal({ publicationStatus: 'published' });
    mockProposalsRepo.findOne.mockResolvedValue(proposal);
    mockVersionsRepo.remove.mockResolvedValue(undefined);
    mockVersionsRepo.count.mockResolvedValue(1);

    await service.removeVersion('proposal-1', 'version-1', actor);

    expect(mockQueryBuilderExecute).not.toHaveBeenCalled();
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

    expect(mockQueryBuilderExecute).not.toHaveBeenCalled();
    expect(mockProposalsRepo.update).toHaveBeenCalledWith(
      { id: 'proposal-1' },
      { updatedBy: 'admin-1' },
    );
  });
});
