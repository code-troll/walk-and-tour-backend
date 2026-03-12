import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import {
  BLOG_PUBLICATION_STATUSES,
  BLOG_TRANSLATION_PUBLICATION_STATUSES,
} from '../shared/domain';
import { TagEntity } from '../tags/tag.entity';
import { CreateBlogPostDto, CreateBlogPostTranslationDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';

interface BlogAggregateInput {
  slug: string;
  heroMediaRef?: string | null;
  category?: string;
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
    @InjectRepository(TagEntity)
    private readonly tagsRepository: Repository<TagEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
  ) {}

  async findAll(): Promise<unknown[]> {
    const blogPosts = await this.blogPostsRepository.find({
      relations: {
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
      slug: aggregate.slug,
      heroMediaRef: aggregate.heroMediaRef ?? null,
      category: aggregate.category ?? null,
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

    existing.slug = aggregate.slug;
    existing.heroMediaRef = aggregate.heroMediaRef ?? null;
    existing.category = aggregate.category ?? null;
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
      slug: source.slug ?? existing?.slug ?? '',
      heroMediaRef:
        'heroMediaRef' in source
          ? (source.heroMediaRef ?? null)
          : (existing?.heroMediaRef ?? null),
      category:
        'category' in source ? source.category ?? undefined : existing?.category ?? undefined,
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
    existingTranslations: BlogPostTranslationEntity[],
    incomingTranslations: CreateBlogPostTranslationDto[],
  ): Promise<void> {
    const existingByCode = new Map(
      existingTranslations.map((translation) => [translation.languageCode, translation]),
    );

    for (const incoming of incomingTranslations) {
      const existing = existingByCode.get(incoming.languageCode);

      if (existing) {
        existing.publicationStatus = incoming.publicationStatus;
        existing.title = incoming.title ?? '';
        existing.summary = incoming.summary ?? null;
        existing.htmlContent = incoming.htmlContent ?? '';
        existing.seoTitle = incoming.seoTitle ?? null;
        existing.seoDescription = incoming.seoDescription ?? null;
        existing.imageRefs = incoming.imageRefs ?? [];
        await this.translationsRepository.save(existing);
      } else {
        await this.translationsRepository.save(
          this.translationsRepository.create({
            blogPostId,
            languageCode: incoming.languageCode,
            publicationStatus: incoming.publicationStatus,
            title: incoming.title ?? '',
            summary: incoming.summary ?? null,
            htmlContent: incoming.htmlContent ?? '',
            seoTitle: incoming.seoTitle ?? null,
            seoDescription: incoming.seoDescription ?? null,
            imageRefs: incoming.imageRefs ?? [],
          }),
        );
      }
    }
  }

  private mergeTranslations(
    existing: BlogPostEntity | undefined,
    incoming: CreateBlogPostTranslationDto[] | undefined,
  ): CreateBlogPostTranslationDto[] {
    const merged = new Map<string, CreateBlogPostTranslationDto>();

    for (const translation of existing?.translations ?? []) {
      merged.set(translation.languageCode, {
        languageCode: translation.languageCode,
        publicationStatus: translation.publicationStatus,
        title: translation.title || undefined,
        summary: translation.summary ?? undefined,
        htmlContent: translation.htmlContent || undefined,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
        imageRefs: translation.imageRefs ?? [],
      });
    }

    for (const translation of incoming ?? []) {
      merged.set(translation.languageCode, translation);
    }

    return [...merged.values()];
  }

  private async findEntityOrThrow(id: string): Promise<BlogPostEntity> {
    const blogPost = await this.blogPostsRepository.findOne({
      where: { id },
      relations: {
        tags: true,
        translations: true,
      },
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post "${id}" was not found.`);
    }

    return blogPost;
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
      slug: blogPost.slug,
      heroMediaRef: blogPost.heroMediaRef,
      category: blogPost.category,
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
}
