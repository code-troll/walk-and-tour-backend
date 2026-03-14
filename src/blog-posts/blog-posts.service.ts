import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import {
  BLOG_PUBLICATION_STATUSES,
  BLOG_TRANSLATION_PUBLICATION_STATUSES,
} from '../shared/domain';
import { TagEntity } from '../tags/tag.entity';
import { SetBlogPostHeroMediaDto } from './dto/blog-post-media.dto';
import { CreateBlogPostDto, CreateBlogPostTranslationDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';

interface BlogAggregateInput {
  name: string;
  slug: string;
  publicationStatus: string;
  tagKeys: string[];
  translations: CreateBlogPostTranslationDto[];
}

@Injectable()
export class BlogPostsService {
  constructor(
    @InjectRepository(BlogPostEntity)
    private readonly blogPostsRepository: Repository<BlogPostEntity>,
    @InjectRepository(BlogPostTranslationEntity)
    private readonly translationsRepository: Repository<BlogPostTranslationEntity>,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetsRepository: Repository<MediaAssetEntity>,
    @InjectRepository(TagEntity)
    private readonly tagsRepository: Repository<TagEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
  ) {}

  async findAll(): Promise<unknown[]> {
    const blogPosts = await this.blogPostsRepository.find({
      relations: {
        heroMedia: true,
        tags: true,
        translations: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return blogPosts.map((blogPost) => this.toAdminResponse(blogPost));
  }

  async findOne(id: string): Promise<unknown> {
    const blogPost = await this.findEntityOrThrow(id);
    return this.toAdminResponse(blogPost);
  }

  async create(dto: CreateBlogPostDto, actor: AuthenticatedAdmin): Promise<unknown> {
    const existing = await this.blogPostsRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Blog post slug "${dto.slug}" already exists.`);
    }

    const aggregate = await this.buildAggregate(dto);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);
    await this.validateTranslations(aggregate.translations);

    const blogPost = this.blogPostsRepository.create({
      name: aggregate.name,
      slug: aggregate.slug,
      heroMediaId: null,
      publicationStatus: aggregate.publicationStatus,
      tags,
      createdBy: actor.id,
      updatedBy: actor.id,
      publishedBy: aggregate.publicationStatus === 'published' ? actor.id : null,
      publishedAt: aggregate.publicationStatus === 'published' ? new Date() : null,
    });

    const saved = await this.blogPostsRepository.save(blogPost);
    await this.replaceTranslations(saved.id, aggregate.translations);

    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateBlogPostDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const existing = await this.findEntityOrThrow(id);
    if (dto.slug && dto.slug !== existing.slug) {
      const slugCollision = await this.blogPostsRepository.findOne({
        where: { slug: dto.slug },
      });

      if (slugCollision) {
        throw new ConflictException(`Blog post slug "${dto.slug}" already exists.`);
      }
    }

    const previousPublicationStatus = existing.publicationStatus;
    const aggregate = await this.buildAggregate(dto, existing);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);
    await this.validateTranslations(aggregate.translations);

    existing.name = aggregate.name;
    existing.slug = aggregate.slug;
    existing.publicationStatus = aggregate.publicationStatus;
    existing.tags = tags;
    existing.updatedBy = actor.id;

    if (
      aggregate.publicationStatus === 'published' &&
      previousPublicationStatus !== 'published'
    ) {
      existing.publishedAt = new Date();
      existing.publishedBy = actor.id;
    } else if (aggregate.publicationStatus !== 'published') {
      existing.publishedAt = null;
      existing.publishedBy = null;
    }

    await this.blogPostsRepository.save(existing);
    await this.upsertTranslations(existing.id, existing.translations, aggregate.translations);

    return this.findOne(existing.id);
  }

  private async buildAggregate(
    source: CreateBlogPostDto | UpdateBlogPostDto,
    existing?: BlogPostEntity,
  ): Promise<BlogAggregateInput> {
    const aggregate: BlogAggregateInput = {
      name: source.name ?? existing?.name ?? '',
      slug: source.slug ?? existing?.slug ?? '',
      publicationStatus:
        source.publicationStatus ??
        existing?.publicationStatus ??
        BLOG_PUBLICATION_STATUSES[0],
      tagKeys: source.tagKeys ?? existing?.tags.map((tag) => tag.key) ?? [],
      translations: this.mergeTranslations(existing, source.translations),
    };

    if (!aggregate.slug) {
      throw new BadRequestException('Blog post slug is required.');
    }

    if (!aggregate.name || aggregate.name.trim().length === 0) {
      throw new BadRequestException('Blog post name is required.');
    }

    if (
      !BLOG_PUBLICATION_STATUSES.includes(
        aggregate.publicationStatus as (typeof BLOG_PUBLICATION_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(
        `Blog post publicationStatus "${aggregate.publicationStatus}" is invalid.`,
      );
    }

    return aggregate;
  }

  private async validateTranslations(
    translations: CreateBlogPostTranslationDto[],
  ): Promise<void> {
    const languageCodes = translations.map((translation) => translation.languageCode);

    if (languageCodes.length > 0) {
      const languages = await this.languagesRepository.findBy({
        code: In(languageCodes),
      });

      if (languages.length !== new Set(languageCodes).size) {
        const found = new Set(languages.map((language) => language.code));
        const missing = [...new Set(languageCodes)].filter((code) => !found.has(code));
        throw new BadRequestException(
          `Blog translations reference unknown language codes: ${missing.join(', ')}`,
        );
      }
    }

    for (const translation of translations) {
      if (
        !BLOG_TRANSLATION_PUBLICATION_STATUSES.includes(
          translation.publicationStatus as (typeof BLOG_TRANSLATION_PUBLICATION_STATUSES)[number],
        )
      ) {
        throw new BadRequestException(
          `Blog translation publicationStatus "${translation.publicationStatus}" is invalid.`,
        );
      }

      if (translation.publicationStatus === 'published') {
        if (!translation.title || translation.title.trim().length === 0) {
          throw new BadRequestException(
            `Blog translation "${translation.languageCode}" requires a title before publication.`,
          );
        }

        if (!translation.htmlContent || translation.htmlContent.trim().length === 0) {
          throw new BadRequestException(
            `Blog translation "${translation.languageCode}" requires htmlContent before publication.`,
          );
        }
      }
    }
  }

  async listMedia(id: string): Promise<{ items: unknown[] }> {
    const blogPost = await this.findEntityOrThrow(id);
    return {
      items: blogPost.heroMedia ? [this.toMediaResponse(blogPost, blogPost.heroMedia)] : [],
    };
  }

  async setHeroMedia(
    id: string,
    dto: SetBlogPostHeroMediaDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    await this.findEntityOrThrow(id);
    await this.getMediaAssetOrThrow(dto.mediaId);
    await this.blogPostsRepository.update(
      { id },
      {
        heroMediaId: dto.mediaId,
        updatedBy: actor.id,
      },
    );

    return this.findOne(id);
  }

  async clearHeroMedia(id: string, actor: AuthenticatedAdmin): Promise<unknown> {
    await this.findEntityOrThrow(id);
    await this.blogPostsRepository.update(
      { id },
      {
        heroMediaId: null,
        updatedBy: actor.id,
      },
    );

    return this.findOne(id);
  }

  private async getTagsOrThrow(keys: string[]): Promise<TagEntity[]> {
    if (keys.length === 0) {
      return [];
    }

    const tags = await this.tagsRepository.findBy({
      key: In(keys),
    });

    if (tags.length !== keys.length) {
      const found = new Set(tags.map((tag) => tag.key));
      const missing = keys.filter((key) => !found.has(key));
      throw new BadRequestException(`Unknown tag keys: ${missing.join(', ')}`);
    }

    return keys.map((key) => tags.find((tag) => tag.key === key) as TagEntity);
  }

  private async replaceTranslations(
    blogPostId: string,
    translations: CreateBlogPostTranslationDto[],
  ): Promise<void> {
    if (translations.length === 0) {
      return;
    }

    const entities = translations.map((translation) =>
      this.translationsRepository.create({
        blogPostId,
        languageCode: translation.languageCode,
        publicationStatus: translation.publicationStatus,
        title: translation.title ?? '',
        summary: translation.summary ?? null,
        htmlContent: translation.htmlContent ?? '',
        seoTitle: translation.seoTitle ?? null,
        seoDescription: translation.seoDescription ?? null,
        imageRefs: translation.imageRefs ?? [],
      }),
    );

    await this.translationsRepository.save(entities);
  }

  private async upsertTranslations(
    blogPostId: string,
    existing: BlogPostTranslationEntity[],
    incoming: CreateBlogPostTranslationDto[],
  ): Promise<void> {
    const existingByLanguage = new Map(
      existing.map((translation) => [translation.languageCode, translation]),
    );

    const upserts = incoming.map((translation) => {
      const current = existingByLanguage.get(translation.languageCode);

      if (!current) {
        return this.translationsRepository.create({
          blogPostId,
          languageCode: translation.languageCode,
          publicationStatus: translation.publicationStatus,
          title: translation.title ?? '',
          summary: translation.summary ?? null,
          htmlContent: translation.htmlContent ?? '',
          seoTitle: translation.seoTitle ?? null,
          seoDescription: translation.seoDescription ?? null,
          imageRefs: translation.imageRefs ?? [],
        });
      }

      current.publicationStatus = translation.publicationStatus;
      current.title = translation.title ?? current.title;
      current.summary = translation.summary ?? null;
      current.htmlContent = translation.htmlContent ?? current.htmlContent;
      current.seoTitle = translation.seoTitle ?? null;
      current.seoDescription = translation.seoDescription ?? null;
      current.imageRefs = translation.imageRefs ?? [];

      return current;
    });

    if (upserts.length > 0) {
      await this.translationsRepository.save(upserts);
    }
  }

  private mergeTranslations(
    existing: BlogPostEntity | undefined,
    incoming: CreateBlogPostTranslationDto[] | undefined,
  ): CreateBlogPostTranslationDto[] {
    if (!incoming) {
      return (
        existing?.translations.map((translation) => ({
          languageCode: translation.languageCode,
          publicationStatus: translation.publicationStatus,
          title: translation.title,
          summary: translation.summary ?? undefined,
          htmlContent: translation.htmlContent,
          seoTitle: translation.seoTitle ?? undefined,
          seoDescription: translation.seoDescription ?? undefined,
          imageRefs: translation.imageRefs,
        })) ?? []
      );
    }

    const existingByLanguage = new Map(
      existing?.translations.map((translation) => [translation.languageCode, translation]) ?? [],
    );

    return incoming.map((translation) => {
      const current = existingByLanguage.get(translation.languageCode);

      return {
        languageCode: translation.languageCode,
        publicationStatus: translation.publicationStatus,
        title: translation.title ?? current?.title,
        summary: translation.summary ?? current?.summary ?? undefined,
        htmlContent: translation.htmlContent ?? current?.htmlContent,
        seoTitle: translation.seoTitle ?? current?.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? current?.seoDescription ?? undefined,
        imageRefs: translation.imageRefs ?? current?.imageRefs ?? [],
      };
    });
  }

  private async findEntityOrThrow(id: string): Promise<BlogPostEntity> {
    const blogPost = await this.blogPostsRepository.findOne({
      where: { id },
      relations: {
        heroMedia: true,
        tags: true,
        translations: true,
      },
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post "${id}" was not found.`);
    }

    return blogPost;
  }

  private async getMediaAssetOrThrow(id: string): Promise<MediaAssetEntity> {
    const mediaAsset = await this.mediaAssetsRepository.findOne({
      where: { id },
    });

    if (!mediaAsset) {
      throw new BadRequestException(`Unknown heroMediaId "${id}".`);
    }

    return mediaAsset;
  }

  private toAdminResponse(blogPost: BlogPostEntity): unknown {
    const translations = Object.fromEntries(
      blogPost.translations.map((translation) => [
        translation.languageCode,
        {
          publicationStatus: translation.publicationStatus,
          title: translation.title,
          summary: translation.summary,
          htmlContent: translation.htmlContent,
          seoTitle: translation.seoTitle,
          seoDescription: translation.seoDescription,
          imageRefs: translation.imageRefs,
        },
      ]),
    );

    return {
      id: blogPost.id,
      name: blogPost.name,
      slug: blogPost.slug,
      heroMediaId: blogPost.heroMediaId,
      heroMedia: this.toMediaResponse(blogPost, blogPost.heroMedia),
      publicationStatus: blogPost.publicationStatus,
      tagKeys: blogPost.tags.map((tag) => tag.key),
      tags: blogPost.tags.map((tag) => ({
        key: tag.key,
        labels: tag.labels,
      })),
      translations,
      translationAvailability: blogPost.translations.map((translation) => ({
        languageCode: translation.languageCode,
        publicationStatus: translation.publicationStatus,
        publiclyAvailable:
          blogPost.publicationStatus === 'published' &&
          translation.publicationStatus === 'published',
      })),
      audit: {
        createdBy: blogPost.createdBy,
        updatedBy: blogPost.updatedBy,
        publishedBy: blogPost.publishedBy,
        createdAt: blogPost.createdAt,
        updatedAt: blogPost.updatedAt,
        publishedAt: blogPost.publishedAt,
      },
    };
  }

  private toMediaResponse(_blogPost: BlogPostEntity, media: MediaAssetEntity | null): {
    id: string;
    mediaType: 'image' | 'video';
    storagePath: string;
    contentUrl: string;
    contentType: string;
    size: number;
    originalFilename: string;
  } | null {
    if (!media) {
      return null;
    }

    return {
      id: media.id,
      mediaType: media.mediaType,
      storagePath: media.storagePath,
      contentUrl: this.buildAdminContentUrl(media.id),
      contentType: media.contentType,
      size: media.size,
      originalFilename: media.originalFilename,
    };
  }

  private buildAdminContentUrl(mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/admin/media/${mediaId}/content`;
  }
}
