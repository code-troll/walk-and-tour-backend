import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';

@Injectable()
export class PublicBlogPostsService {
  constructor(
    @InjectRepository(BlogPostEntity)
    private readonly blogPostsRepository: Repository<BlogPostEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
  ) {}

  async findAll(locale: string): Promise<unknown[]> {
    await this.assertPublicLocale(locale);

    const blogPosts = await this.blogPostsRepository.find({
      relations: {
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
    if (blogPost.publicationStatus !== 'published') {
      return null;
    }

    const translation = blogPost.translations.find(
      (entry) =>
        entry.languageCode === locale && entry.publicationStatus === 'published',
    );

    if (!translation) {
      return null;
    }

    return {
      id: blogPost.id,
      slug: blogPost.slug,
      heroMediaRef: blogPost.heroMediaRef,
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
}
