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
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { TagEntity } from '../tags/tag.entity';
import { SetBlogPostHeroMediaDto } from './dto/blog-post-media.dto';
import {
  CreateBlogPostTranslationDto,
  UpdateBlogPostTranslationDto,
} from './dto/blog-post-translation.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';

interface BlogSharedInput {
  name: string;
  tagKeys: string[];
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
    const aggregate = this.buildSharedAggregate(dto);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);

    const blogPost = this.blogPostsRepository.create({
      name: aggregate.name,
      heroMediaId: null,
      tags,
      createdBy: actor.id,
      updatedBy: actor.id,
      publishedAt: null,
    });

    const saved = await this.blogPostsRepository.save(blogPost);

    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateBlogPostDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const existing = await this.findEntityOrThrow(id);

    const aggregate = this.buildSharedAggregate(dto, existing);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);

    existing.name = aggregate.name;
    existing.tags = tags;
    existing.updatedBy = actor.id;

    await this.blogPostsRepository.save(existing);

    return this.findOne(existing.id);
  }

  async createTranslation(
    id: string,
    dto: CreateBlogPostTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const blogPost = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(dto.languageCode);

    const existing = blogPost.translations.find(
      (translation) => translation.languageCode === dto.languageCode,
    );

    if (existing) {
      throw new ConflictException(
        `Blog translation "${dto.languageCode}" already exists for blog post "${id}".`,
      );
    }

    await this.assertSlugAvailable(dto.slug);

    const translation = this.translationsRepository.create({
      blogPostId: id,
      languageCode: dto.languageCode,
      slug: dto.slug,
      isPublished: false,
      title: dto.title ?? '',
      summary: dto.summary ?? null,
      htmlContent: dto.htmlContent ?? '',
      seoTitle: dto.seoTitle ?? null,
      seoDescription: dto.seoDescription ?? null,
      imageRefs: dto.imageRefs ?? [],
      viewCount: 0,
    });

    await this.translationsRepository.save(translation);
    await this.touchBlogPost(blogPost.id, actor);

    return this.findOne(id);
  }

  async updateTranslation(
    id: string,
    languageCode: string,
    dto: UpdateBlogPostTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const blogPost = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(languageCode);
    const translation = this.findTranslationOrThrow(blogPost, languageCode);

    if (dto.slug && dto.slug !== translation.slug) {
      await this.assertSlugAvailable(dto.slug);
      translation.slug = dto.slug;
    }

    if ('title' in dto) {
      translation.title = dto.title ?? '';
    }

    if ('summary' in dto) {
      translation.summary = dto.summary ?? null;
    }

    if ('htmlContent' in dto) {
      translation.htmlContent = dto.htmlContent ?? '';
    }

    if ('seoTitle' in dto) {
      translation.seoTitle = dto.seoTitle ?? null;
    }

    if ('seoDescription' in dto) {
      translation.seoDescription = dto.seoDescription ?? null;
    }

    if ('imageRefs' in dto) {
      translation.imageRefs = dto.imageRefs ?? [];
    }

    if (!this.isTranslationPublishable(translation)) {
      translation.isPublished = false;
    }

    await this.translationsRepository.save(translation);
    await this.touchBlogPost(blogPost.id, actor);
    await this.syncDerivedPublicationState(blogPost.id);

    return this.findOne(id);
  }

  async publishTranslation(
    id: string,
    languageCode: string,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const blogPost = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(languageCode);
    const translation = this.findTranslationOrThrow(blogPost, languageCode);

    if (!this.isTranslationPublishable(translation)) {
      translation.isPublished = false;
      await this.translationsRepository.save(translation);
      await this.syncDerivedPublicationState(blogPost.id);
      throw new BadRequestException(
        `Translation "${translation.languageCode}" cannot be published until it has both title and htmlContent.`,
      );
    }

    translation.isPublished = true;

    await this.translationsRepository.save(translation);
    await this.touchBlogPost(blogPost.id, actor);
    await this.syncDerivedPublicationState(blogPost.id, new Date());

    return this.findOne(id);
  }

  async unpublishTranslation(
    id: string,
    languageCode: string,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const blogPost = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(languageCode);
    const translation = this.findTranslationOrThrow(blogPost, languageCode);

    translation.isPublished = false;

    await this.translationsRepository.save(translation);
    await this.touchBlogPost(blogPost.id, actor);
    await this.syncDerivedPublicationState(blogPost.id);

    return this.findOne(id);
  }

  async deleteTranslation(
    id: string,
    languageCode: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const blogPost = await this.findEntityOrThrow(id);
    const translation = this.findTranslationOrThrow(blogPost, languageCode);

    await this.translationsRepository.delete({ id: translation.id });
    await this.touchBlogPost(blogPost.id, actor);
    await this.syncDerivedPublicationState(blogPost.id);
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

  private async assertSlugAvailable(slug: string): Promise<void> {
    const existing = await this.translationsRepository.findOne({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Blog post translation slug "${slug}" already exists.`);
    }
  }

  private buildSharedAggregate(
    source: CreateBlogPostDto | UpdateBlogPostDto,
    existing?: BlogPostEntity,
  ): BlogSharedInput {
    const aggregate: BlogSharedInput = {
      name: source.name ?? existing?.name ?? '',
      tagKeys: source.tagKeys ?? existing?.tags.map((tag) => tag.key) ?? [],
    };

    if (!aggregate.name || aggregate.name.trim().length === 0) {
      throw new BadRequestException('Blog post name is required.');
    }

    return {
      ...aggregate,
      name: aggregate.name.trim(),
    };
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

  private async assertLanguageExists(languageCode: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: { code: languageCode },
    });

    if (!language) {
      throw new BadRequestException(
        `Blog translations reference unknown language code: ${languageCode}`,
      );
    }
  }

  private findTranslationOrThrow(
    blogPost: BlogPostEntity,
    languageCode: string,
  ): BlogPostTranslationEntity {
    const translation = blogPost.translations.find(
      (entry) => entry.languageCode === languageCode,
    );

    if (!translation) {
      throw new NotFoundException(
        `Blog translation "${languageCode}" was not found for blog post "${blogPost.id}".`,
      );
    }

    return translation;
  }

  private isTranslationPublishable(
    translation: Pick<BlogPostTranslationEntity, 'title' | 'htmlContent'>,
  ): boolean {
    return (
      translation.title.trim().length > 0 && translation.htmlContent.trim().length > 0
    );
  }

  private async touchBlogPost(id: string, actor: AuthenticatedAdmin): Promise<void> {
    await this.blogPostsRepository.update(
      { id },
      {
        updatedBy: actor.id,
      },
    );
  }

  private async syncDerivedPublicationState(
    blogPostId: string,
    publishedAtOverride?: Date,
  ): Promise<void> {
    if (publishedAtOverride) {
      await this.blogPostsRepository.update(
        { id: blogPostId },
        {
          publishedAt: publishedAtOverride,
        },
      );
      return;
    }

    const publishedTranslations = await this.translationsRepository.count({
      where: {
        blogPostId,
        isPublished: true,
      },
    });

    if (publishedTranslations === 0) {
      await this.blogPostsRepository.update(
        { id: blogPostId },
        {
          publishedAt: null,
        },
      );
    }
  }

  private toAdminResponse(blogPost: BlogPostEntity): unknown {
    const translations = Object.fromEntries(
      blogPost.translations.map((translation) => [
        translation.languageCode,
        {
          slug: translation.slug,
          isPublished: translation.isPublished,
          viewCount: translation.viewCount,
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
      heroMediaId: blogPost.heroMediaId,
      heroMedia: this.toMediaResponse(blogPost, blogPost.heroMedia),
      tagKeys: blogPost.tags.map((tag) => tag.key),
      tags: blogPost.tags.map((tag) => ({
        key: tag.key,
        labels: tag.labels,
      })),
      translations,
      translationAvailability: blogPost.translations.map((translation) => ({
        languageCode: translation.languageCode,
        isPublished: translation.isPublished,
        publiclyAvailable: translation.isPublished,
      })),
      audit: {
        createdBy: blogPost.createdBy,
        updatedBy: blogPost.updatedBy,
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
