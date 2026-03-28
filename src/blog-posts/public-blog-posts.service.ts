import { createHash } from 'crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostViewEntity } from './blog-post-view.entity';
import { BlogPostEntity } from './blog-post.entity';

export interface PublicBlogRequestContext {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
}

@Injectable()
export class PublicBlogPostsService {
  constructor(
    @InjectRepository(BlogPostEntity)
    private readonly blogPostsRepository: Repository<BlogPostEntity>,
    @InjectRepository(BlogPostTranslationEntity)
    private readonly translationsRepository: Repository<BlogPostTranslationEntity>,
    @InjectRepository(BlogPostViewEntity)
    private readonly blogPostViewsRepository: Repository<BlogPostViewEntity>,
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
      .map((blogPost) => {
        const translation = this.findPublishedTranslation(blogPost, locale);
        return translation ? this.toPublicResponse(blogPost, translation, locale) : null;
      })
      .filter((blogPost): blogPost is NonNullable<typeof blogPost> => blogPost !== null);
  }

  async findOneBySlug(
    slug: string,
    locale: string,
    request?: PublicBlogRequestContext,
  ): Promise<unknown> {
    await this.assertPublicLocale(locale);

    const translation = await this.translationsRepository.findOne({
      where: { slug },
      relations: {
        blogPost: {
          heroMedia: true,
          tags: true,
          translations: true,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Blog post "${slug}" was not found.`);
    }

    if (translation.languageCode !== locale) {
      throw new NotFoundException(
        `Blog post "${slug}" is not publicly available for locale "${locale}".`,
      );
    }

    if (!translation.isPublished) {
      throw new NotFoundException(
        `Blog post "${slug}" is not publicly available for locale "${locale}".`,
      );
    }

    const countedView = request ? await this.trackView(translation.id, request) : false;

    if (countedView) {
      translation.viewCount += 1;
    }

    return this.toPublicResponse(translation.blogPost, translation, locale);
  }

  async getMediaContent(
    slug: string,
    mediaId: string,
  ): Promise<{
    content: Buffer;
    contentType: string;
    originalFilename: string;
  }> {
    const translation = await this.translationsRepository.findOne({
      where: { slug },
      relations: {
        blogPost: {
          heroMedia: true,
          translations: true,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Blog post "${slug}" was not found.`);
    }

    const blogPost = translation.blogPost;

    const hasPublicTranslation = blogPost.translations.some(
      (t) => t.isPublished,
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

  private findPublishedTranslation(
    blogPost: BlogPostEntity,
    locale: string,
  ): BlogPostTranslationEntity | null {
    return (
      blogPost.translations.find(
        (entry) => entry.languageCode === locale && entry.isPublished,
      ) ?? null
    );
  }

  private toPublicResponse(
    blogPost: BlogPostEntity,
    translation: BlogPostTranslationEntity,
    locale: string,
  ): unknown {
    return {
      id: blogPost.id,
      slug: translation.slug,
      heroMedia: this.toMediaResponse(translation.slug, blogPost.heroMedia),
      tags: blogPost.tags.map((tag) => ({
        key: tag.key,
        label: tag.labels[locale] ?? null,
      })),
      translation: this.toTranslationResponse(translation),
      publishedAt: blogPost.publishedAt,
    };
  }

  private async trackView(
    blogPostTranslationId: string,
    request: PublicBlogRequestContext,
  ): Promise<boolean> {
    const viewerHash = this.buildViewerHash(request);

    if (!viewerHash) {
      return false;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.blogPostViewsRepository.manager.transaction(async (manager) => {
      const upserted: Array<{ blog_post_translation_id: string }> = await manager.query(
        `
          INSERT INTO "blog_post_views" ("blog_post_translation_id", "viewer_hash", "last_viewed_at")
          VALUES ($1, $2, $3)
          ON CONFLICT ("blog_post_translation_id", "viewer_hash")
          DO UPDATE
          SET "last_viewed_at" = EXCLUDED."last_viewed_at"
          WHERE "blog_post_views"."last_viewed_at" < $4
          RETURNING "blog_post_translation_id"
        `,
        [blogPostTranslationId, viewerHash, now, cutoff],
      );

      if (upserted.length === 0) {
        return false;
      }

      await manager.query(
        `
          UPDATE "blog_post_translations"
          SET "view_count" = "view_count" + 1
          WHERE "id" = $1
        `,
        [blogPostTranslationId],
      );

      return true;
    });
  }

  private buildViewerHash(request: PublicBlogRequestContext): string | null {
    const clientIp = this.resolveClientIp(request);

    if (!clientIp) {
      return null;
    }

    return createHash('sha256').update(clientIp).digest('hex');
  }

  private resolveClientIp(request: PublicBlogRequestContext): string | null {
    const forwardedFor = this.extractFirstHeaderValue(
      request.headers['x-forwarded-for'] ?? request.headers['X-Forwarded-For'],
    );
    const candidate = forwardedFor?.split(',')[0] ?? request.ip ?? request.socket?.remoteAddress;

    if (!candidate) {
      return null;
    }

    return this.normalizeIpAddress(candidate);
  }

  private extractFirstHeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value ?? null;
  }

  private normalizeIpAddress(ip: string): string {
    let normalized = ip.trim().toLowerCase();

    if (normalized.startsWith('[') && normalized.includes(']')) {
      normalized = normalized.slice(1, normalized.indexOf(']'));
    }

    if (normalized.startsWith('::ffff:')) {
      normalized = normalized.slice(7);
    }

    if (normalized.includes('.') && normalized.includes(':')) {
      normalized = normalized.slice(0, normalized.lastIndexOf(':'));
    }

    return normalized;
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
      viewCount: translation.viewCount,
    };
  }

  private toMediaResponse(translationSlug: string, media: BlogPostEntity['heroMedia']): {
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
      contentUrl: this.buildContentUrl(translationSlug, media.id),
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
