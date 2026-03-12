export const SUPPORTED_LANGUAGE_CODES = ['en', 'es', 'it'] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];
