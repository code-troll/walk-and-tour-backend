export const BLOG_PUBLICATION_STATUSES = ['draft', 'published'] as const;

export const BLOG_TRANSLATION_PUBLICATION_STATUSES = [
  'published',
  'unpublished',
] as const;

export type BlogPublicationStatus =
  (typeof BLOG_PUBLICATION_STATUSES)[number];

export type BlogTranslationPublicationStatus =
  (typeof BLOG_TRANSLATION_PUBLICATION_STATUSES)[number];
