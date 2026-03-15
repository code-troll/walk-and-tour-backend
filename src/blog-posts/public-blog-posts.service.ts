import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';

@Injectable()
export class PublicBlogPostsService {
  constructor(
    @InjectRepository(BlogPostEntity)
    private readonly blogPostsRepository: Repository<BlogPostEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async findAll(locale: string): Promise<unknown[]> {
    await this.assertPublicLocale(locale);

    const blogPosts = await this.blogPostsRepository.find({
      relations: {
        heroMedia: true,
        tags: true,
        translations: true,
      },
      order: {
        publishedAt: 'DESC',
      },
    });

    return blogPosts
      .map((blogPost) => this.toPublicResponse(blogPost, locale))
      .filter((blogPost): blogPost is NonNullable<typeof blogPost> => blogPost !== null);
  }

  async findOneBySlug(slug: string, locale: string): Promise<unknown> {
    await this.assertPublicLocale(locale);

    const blogPost = await this.blogPostsRepository.findOne({
      where: { slug },
      relations: {
        heroMedia: true,
        tags: true,
        translations: true,
      },
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post "${slug}" was not found.`);
    }

    const response = this.toPublicResponse(blogPost, locale);

    if (!response) {
      throw new NotFoundException(
        `Blog post "${slug}" is not publicly available for locale "${locale}".`,
      );
    }

    return response;
  }

  async getMediaContent(
    slug: string,
    mediaId: string,
  ): Promise<{
    content: Buffer;
    contentType: string;
    originalFilename: string;
  }> {
    const blogPost = await this.blogPostsRepository.findOne({
      where: { slug },
      relations: {
        heroMedia: true,
        translations: true,
      },
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post "${slug}" was not found.`);
    }

    const hasPublicTranslation = blogPost.translations.some(
      (translation) => translation.isPublished,
    );

    if (!hasPublicTranslation || !blogPost.heroMedia || blogPost.heroMedia.id !== mediaId) {
      throw new NotFoundException(
        `Media asset "${mediaId}" is not attached to blog post "${slug}".`,
      );
    }

    const stored = await this.storageService.getObject(blogPost.heroMedia.storagePath);

    return {
      content: stored.content,
      contentType: stored.contentType ?? blogPost.heroMedia.contentType,
      originalFilename: blogPost.heroMedia.originalFilename,
    };
  }

  private async assertPublicLocale(locale: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: {
        code: locale,
        isEnabled: true,
      },
    });

    if (!language) {
      throw new NotFoundException(`Locale "${locale}" is not publicly available.`);
    }
  }

  private toPublicResponse(blogPost: BlogPostEntity, locale: string): unknown | null {
    const translation = blogPost.translations.find(
      (entry) => entry.languageCode === locale && entry.isPublished,
    );

    if (!translation) {
      return null;
    }

    return {
      id: blogPost.id,
      slug: blogPost.slug,
      heroMedia: this.toMediaResponse(blogPost, blogPost.heroMedia),
      tags: blogPost.tags.map((tag) => ({
        key: tag.key,
        label: tag.labels[locale] ?? null,
      })),
      translation: this.toTranslationResponse(translation),
      publishedAt: blogPost.publishedAt,
    };
  }

  private toTranslationResponse(translation: BlogPostTranslationEntity): unknown {
    return {
      locale: translation.languageCode,
      title: translation.title,
      summary: translation.summary,
      htmlContent: translation.htmlContent,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      imageRefs: translation.imageRefs,
    };
  }

  private toMediaResponse(blogPost: BlogPostEntity, media: BlogPostEntity['heroMedia']): {
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
      contentUrl: this.buildContentUrl(blogPost.slug, media.id),
      contentType: media.contentType,
      size: media.size,
      originalFilename: media.originalFilename,
    };
  }

  private buildContentUrl(blogSlug: string, mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/public/blog-posts/${encodeURIComponent(blogSlug)}/media/${mediaId}`;
  }
}
