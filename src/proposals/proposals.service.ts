import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { EMAIL_PROVIDER, EmailProvider } from '../providers/email/email-provider.interface';
import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';
import { AdminListProposalsDto } from './dto/list-proposals.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CreateProposalVersionDto } from './dto/create-proposal-version.dto';
import { AttachProposalMediaDto, UpdateProposalMediaDto } from './dto/proposal-media.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { UpdateProposalVersionDto } from './dto/update-proposal-version.dto';
import { ProposalMediaEntity } from './entities/proposal-media.entity';
import { ProposalVersionEntity } from './entities/proposal-version.entity';
import { ProposalEntity } from './entities/proposal.entity';

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    @InjectRepository(ProposalEntity)
    private readonly proposalsRepository: Repository<ProposalEntity>,
    @InjectRepository(ProposalVersionEntity)
    private readonly versionsRepository: Repository<ProposalVersionEntity>,
    @InjectRepository(ProposalMediaEntity)
    private readonly proposalMediaRepository: Repository<ProposalMediaEntity>,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetsRepository: Repository<MediaAssetEntity>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  // ─── Admin CRUD ────────────────────────────────────────────

  async findAll(query: AdminListProposalsDto = {}): Promise<unknown[]> {
    const qb = this.proposalsRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.versions', 'version')
      .leftJoinAndSelect('proposal.mediaItems', 'media')
      .orderBy('proposal.createdAt', 'DESC');

    if (!query.includeExpired) {
      qb.andWhere('(proposal.expiresAt IS NULL OR proposal.expiresAt > NOW())');
    }

    if (query.search?.trim()) {
      const pattern = `%${query.search.trim()}%`;
      qb.andWhere(
        '(proposal.recipientName ILIKE :pattern OR proposal.recipientEmail ILIKE :pattern)',
        { pattern },
      );
    }

    const proposals = await qb.getMany();
    return proposals.map((p) => this.toAdminResponse(p));
  }

  async findOne(id: string): Promise<unknown> {
    const proposal = await this.findEntityOrThrow(id);
    return this.toAdminResponse(proposal);
  }

  async create(dto: CreateProposalDto, actor: AuthenticatedAdmin): Promise<unknown> {
    const hash = nanoid(12);

    const proposal = await this.proposalsRepository.save(
      this.proposalsRepository.create({
        hash,
        language: dto.language,
        recipientName: dto.recipientName ?? null,
        recipientEmail: dto.recipientEmail ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes ?? null,
        createdBy: actor.id,
        updatedBy: actor.id,
      }),
    );

    return this.findOne(proposal.id);
  }

  async update(
    id: string,
    dto: UpdateProposalDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const proposal = await this.findEntityOrThrow(id);

    if (dto.publicationStatus === 'published' && proposal.publicationStatus !== 'published') {
      const versionCount = proposal.versions?.length ?? 0;
      if (versionCount === 0) {
        throw new BadRequestException(
          'Cannot publish a proposal without at least one saved version.',
        );
      }
    }

    const updates: Record<string, unknown> = { updatedBy: actor.id };
    if (dto.language !== undefined) updates.language = dto.language;
    if (dto.recipientName !== undefined) updates.recipientName = dto.recipientName ?? null;
    if (dto.recipientEmail !== undefined) updates.recipientEmail = dto.recipientEmail ?? null;
    if (dto.acceptanceStatus !== undefined) updates.acceptanceStatus = dto.acceptanceStatus;
    if (dto.publicationStatus !== undefined) updates.publicationStatus = dto.publicationStatus;
    if (dto.expiresAt !== undefined) updates.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.notes !== undefined) updates.notes = dto.notes ?? null;

    await this.proposalsRepository.update({ id }, updates as any);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const proposal = await this.findEntityOrThrow(id);
    await this.proposalsRepository.remove(proposal);
  }

  async sendToRecipient(id: string, proposalPublicBaseUrl: string): Promise<void> {
    const proposal = await this.findEntityOrThrow(id);

    if (proposal.publicationStatus !== 'published') {
      throw new BadRequestException(
        'The proposal must be published before sending it to the recipient.',
      );
    }

    if (!proposal.recipientEmail) {
      throw new BadRequestException(
        'The proposal does not have a recipient email address.',
      );
    }

    const versions = proposal.versions ?? [];
    if (versions.length === 0) {
      throw new BadRequestException(
        'Cannot send a proposal without at least one version.',
      );
    }

    const sortedVersions = [...versions].sort((a, b) => a.orderIndex - b.orderIndex);
    const proposalUrl = `${proposalPublicBaseUrl.replace(/\/$/, '')}/private-tours/proposal/${proposal.hash}`;

    await this.emailProvider.sendProposalLink({
      recipientEmail: proposal.recipientEmail,
      recipientName: proposal.recipientName,
      proposalUrl,
      firstVersionTitle: sortedVersions[0].title,
      language: proposal.language,
      publicBaseUrl: proposalPublicBaseUrl.replace(/\/$/, ''),
    });
  }

  // ─── Versions ──────────────────────────────────────────────

  async createVersion(
    proposalId: string,
    dto: CreateProposalVersionDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const proposal = await this.findEntityOrThrow(proposalId);
    const orderIndex = dto.orderIndex ?? this.getNextVersionOrderIndex(proposal.versions ?? []);

    const version = new ProposalVersionEntity();
    version.proposalId = proposalId;
    version.orderIndex = orderIndex;
    version.tourDate = dto.tourDate ? new Date(dto.tourDate) : null;
    version.durationMinutes = dto.durationMinutes ?? null;
    version.title = dto.title;
    version.description = dto.description ?? null;
    version.itineraryDescription = dto.itineraryDescription ?? null;
    version.priceAmount = String(dto.priceAmount);
    version.priceCurrency = dto.priceCurrency;
    version.included = dto.included ?? [];
    version.notIncluded = dto.notIncluded ?? [];
    version.cancellationPolicy = dto.cancellationPolicy ?? null;
    version.startPoint = dto.startPoint ? { ...dto.startPoint } : null;
    version.endPoint = dto.endPoint ? { ...dto.endPoint } : null;
    version.stripePaymentLink = dto.stripePaymentLink ?? null;
    await this.versionsRepository.save(version);

    await this.touchProposal(proposal.id, actor.id);
    return this.findOne(proposalId);
  }

  async updateVersion(
    proposalId: string,
    versionId: string,
    dto: UpdateProposalVersionDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const proposal = await this.findEntityOrThrow(proposalId);
    const version = this.findVersionOrThrow(proposal, versionId);

    if (dto.orderIndex !== undefined) version.orderIndex = dto.orderIndex;
    if (dto.tourDate !== undefined) version.tourDate = dto.tourDate ? new Date(dto.tourDate) : null;
    if (dto.durationMinutes !== undefined) version.durationMinutes = dto.durationMinutes ?? null;
    if (dto.title !== undefined) version.title = dto.title;
    if (dto.description !== undefined) version.description = dto.description ?? null;
    if (dto.itineraryDescription !== undefined) version.itineraryDescription = dto.itineraryDescription ?? null;
    if (dto.priceAmount !== undefined) version.priceAmount = String(dto.priceAmount);
    if (dto.priceCurrency !== undefined) version.priceCurrency = dto.priceCurrency;
    if (dto.included !== undefined) version.included = dto.included;
    if (dto.notIncluded !== undefined) version.notIncluded = dto.notIncluded;
    if (dto.cancellationPolicy !== undefined) version.cancellationPolicy = dto.cancellationPolicy ?? null;
    if (dto.startPoint !== undefined) version.startPoint = dto.startPoint ? { ...dto.startPoint } : null;
    if (dto.endPoint !== undefined) version.endPoint = dto.endPoint ? { ...dto.endPoint } : null;
    if (dto.stripePaymentLink !== undefined) version.stripePaymentLink = dto.stripePaymentLink ?? null;

    await this.versionsRepository.save(version);
    await this.touchProposal(proposal.id, actor.id);
    return this.findOne(proposalId);
  }

  async removeVersion(
    proposalId: string,
    versionId: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const proposal = await this.findEntityOrThrow(proposalId);
    const version = this.findVersionOrThrow(proposal, versionId);
    await this.versionsRepository.remove(version);

    const remainingCount = await this.versionsRepository.count({ where: { proposalId } });
    if (remainingCount === 0 && proposal.publicationStatus === 'published') {
      await this.proposalsRepository
        .createQueryBuilder()
        .update(ProposalEntity)
        .set({ publicationStatus: 'unpublished', updatedBy: actor.id })
        .where('id = :id', { id: proposalId })
        .execute();
    } else {
      await this.touchProposal(proposal.id, actor.id);
    }
  }

  // ─── Media ─────────────────────────────────────────────────

  async attachMedia(
    proposalId: string,
    dto: AttachProposalMediaDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const proposal = await this.findEntityOrThrow(proposalId);

    const existing = proposal.mediaItems.find((m) => m.mediaId === dto.mediaId);
    if (existing) {
      throw new ConflictException(
        `Media asset "${dto.mediaId}" is already attached to proposal "${proposalId}".`,
      );
    }

    const mediaAsset = await this.mediaAssetsRepository.findOne({ where: { id: dto.mediaId } });
    if (!mediaAsset) {
      throw new NotFoundException(`Media asset "${dto.mediaId}" was not found.`);
    }

    const orderIndex = dto.orderIndex ?? this.getNextMediaOrderIndex(proposal.mediaItems ?? []);

    await this.proposalMediaRepository.save(
      this.proposalMediaRepository.create({
        proposalId,
        mediaId: mediaAsset.id,
        orderIndex,
        altText: dto.altText ?? null,
      }),
    );

    await this.touchProposal(proposal.id, actor.id);
    return this.findOne(proposalId);
  }

  async updateMedia(
    proposalId: string,
    rowId: string,
    dto: UpdateProposalMediaDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const proposal = await this.findEntityOrThrow(proposalId);
    const attachment = proposal.mediaItems.find((m) => m.rowId === rowId);
    if (!attachment) {
      throw new NotFoundException(
        `Media attachment "${rowId}" was not found on proposal "${proposalId}".`,
      );
    }

    if (dto.orderIndex !== undefined) attachment.orderIndex = dto.orderIndex;
    if ('altText' in dto) attachment.altText = dto.altText ?? null;

    await this.proposalMediaRepository.save(attachment);
    await this.touchProposal(proposal.id, actor.id);
    return this.findOne(proposalId);
  }

  async detachMedia(
    proposalId: string,
    rowId: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const proposal = await this.findEntityOrThrow(proposalId);
    const attachment = proposal.mediaItems.find((m) => m.rowId === rowId);
    if (!attachment) {
      throw new NotFoundException(
        `Media attachment "${rowId}" was not found on proposal "${proposalId}".`,
      );
    }

    await this.proposalMediaRepository.remove(attachment);
    await this.touchProposal(proposal.id, actor.id);
  }

  // ─── Public ────────────────────────────────────────────────

  async findByHash(hash: string): Promise<unknown> {
    const proposal = await this.proposalsRepository.findOne({
      where: { hash },
      relations: { versions: true, mediaItems: { media: true } },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found.');
    }

    if (proposal.publicationStatus !== 'published') {
      throw new NotFoundException('Proposal not found.');
    }

    if (proposal.expiresAt && proposal.expiresAt < new Date()) {
      throw new NotFoundException('Proposal not found.');
    }

    return this.toPublicResponse(proposal);
  }

  async getPublicMediaContent(
    hash: string,
    mediaId: string,
  ): Promise<{ content: Buffer; contentType: string; originalFilename: string }> {
    const proposal = await this.proposalsRepository.findOne({
      where: { hash },
      relations: { mediaItems: { media: true } },
    });

    if (!proposal || proposal.publicationStatus !== 'published') {
      throw new NotFoundException('Proposal not found.');
    }

    if (proposal.expiresAt && proposal.expiresAt < new Date()) {
      throw new NotFoundException('Proposal not found.');
    }

    const attachment = proposal.mediaItems.find((m) => m.mediaId === mediaId);
    if (!attachment) {
      throw new NotFoundException(`Media asset "${mediaId}" is not attached to this proposal.`);
    }

    const stored = await this.storageService.getObject(attachment.media.storagePath);
    return {
      content: stored.content,
      contentType: stored.contentType ?? attachment.media.contentType,
      originalFilename: attachment.media.originalFilename,
    };
  }

  // ─── Private helpers ───────────────────────────────────────

  private async findEntityOrThrow(id: string): Promise<ProposalEntity> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id },
      relations: { versions: true, mediaItems: { media: true } },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal "${id}" was not found.`);
    }

    return proposal;
  }

  private findVersionOrThrow(proposal: ProposalEntity, versionId: string): ProposalVersionEntity {
    const version = proposal.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new NotFoundException(
        `Version "${versionId}" was not found on proposal "${proposal.id}".`,
      );
    }
    return version;
  }

  private getNextVersionOrderIndex(versions: ProposalVersionEntity[]): number {
    if (versions.length === 0) return 0;
    return Math.max(...versions.map((v) => v.orderIndex)) + 1;
  }

  private getNextMediaOrderIndex(mediaItems: ProposalMediaEntity[]): number {
    if (mediaItems.length === 0) return 0;
    return Math.max(...mediaItems.map((m) => m.orderIndex)) + 1;
  }

  private async touchProposal(proposalId: string, actorId: string): Promise<void> {
    await this.proposalsRepository.update({ id: proposalId }, { updatedBy: actorId });
  }

  private toAdminResponse(proposal: ProposalEntity): unknown {
    return {
      id: proposal.id,
      hash: proposal.hash,
      language: proposal.language,
      recipientName: proposal.recipientName,
      recipientEmail: proposal.recipientEmail,
      acceptanceStatus: proposal.acceptanceStatus,
      publicationStatus: proposal.publicationStatus,
      expiresAt: proposal.expiresAt,
      notes: proposal.notes,
      versionsCount: proposal.versions?.length ?? 0,
      versions: (proposal.versions ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((v) => ({
          id: v.id,
          orderIndex: v.orderIndex,
          tourDate: v.tourDate,
          durationMinutes: v.durationMinutes,
          title: v.title,
          description: v.description,
          itineraryDescription: v.itineraryDescription,
          priceAmount: v.priceAmount,
          priceCurrency: v.priceCurrency,
          included: v.included,
          notIncluded: v.notIncluded,
          cancellationPolicy: v.cancellationPolicy,
          startPoint: v.startPoint,
          endPoint: v.endPoint,
          stripePaymentLink: v.stripePaymentLink,
        })),
      mediaItems: (proposal.mediaItems ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((m) => ({
          rowId: m.rowId,
          mediaId: m.mediaId,
          orderIndex: m.orderIndex,
          altText: m.altText,
          media: m.media
            ? {
                id: m.media.id,
                mediaType: m.media.mediaType,
                contentType: m.media.contentType,
                originalFilename: m.media.originalFilename,
                size: m.media.size,
              }
            : null,
        })),
      createdBy: proposal.createdBy,
      updatedBy: proposal.updatedBy,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };
  }

  private toPublicResponse(proposal: ProposalEntity): unknown {
    return {
      language: proposal.language,
      recipientName: proposal.recipientName,
      expiresAt: proposal.expiresAt,
      mediaItems: (proposal.mediaItems ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((m) => ({
          mediaId: m.mediaId,
          orderIndex: m.orderIndex,
          altText: m.altText?.[proposal.language] ?? null,
          contentType: m.media?.contentType ?? null,
        })),
      versions: (proposal.versions ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((v) => ({
          id: v.id,
          orderIndex: v.orderIndex,
          tourDate: v.tourDate,
          durationMinutes: v.durationMinutes,
          title: v.title,
          description: v.description,
          itineraryDescription: v.itineraryDescription,
          priceAmount: v.priceAmount,
          priceCurrency: v.priceCurrency,
          included: v.included,
          notIncluded: v.notIncluded,
          cancellationPolicy: v.cancellationPolicy,
          startPoint: v.startPoint,
          endPoint: v.endPoint,
          stripePaymentLink: v.stripePaymentLink,
        })),
    };
  }
}
