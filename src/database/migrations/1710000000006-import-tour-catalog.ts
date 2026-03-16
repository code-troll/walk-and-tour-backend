import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { MigrationInterface, QueryRunner } from 'typeorm';

type JsonObject = Record<string, unknown>;

interface MigrationInput {
    languages?: LanguageInput[];
    tags?: TagInput[];
    mediaAssets?: MediaAssetInput[];
    tours: TourInput[];
}

interface LanguageInput {
    code: string;
    name: string;
    isEnabled?: boolean;
    sortOrder: number;
}

interface TagInput {
    key: string;
    labels: Record<string, string>;
}

interface MediaAssetInput {
    ref: string;
    mediaType: 'image' | 'video';
    storagePath: string;
    contentType: string;
    size: number;
    originalFilename: string;
}

interface PointInput {
    coordinates?: {
        lat: number;
        lng: number;
    };
}

interface ItineraryStopInput {
    id: string;
    durationMinutes?: number;
    coordinates?: {
        lat: number;
        lng: number;
    };
    nextConnection?: {
        durationMinutes?: number;
        commuteMode: string;
    };
}

interface ItineraryInput {
    variant: 'description' | 'stops';
    stops?: ItineraryStopInput[];
}

interface TourMediaItemInput {
    mediaRef: string;
    orderIndex: number;
    altText?: Record<string, string>;
}

interface TourMediaInput {
    coverRef?: string;
    items?: TourMediaItemInput[];
}

interface TranslationInput {
    languageCode: string;
    bookingReferenceId?: string | null;
    isPublished?: boolean;
    payload: JsonObject;
}

interface TourInput {
    ref: string;
    name: string;
    slug: string;
    tourType: 'private' | 'group' | 'tip_based' | 'company';
    contentSchema?: JsonObject;
    price?: {
        amount: number;
        currency: string;
    } | null;
    rating?: number;
    reviewCount?: number;
    durationMinutes?: number;
    startPoint?: PointInput;
    endPoint?: PointInput;
    itinerary?: ItineraryInput;
    tagKeys?: string[];
    media?: TourMediaInput;
    translations: TranslationInput[];
}

const REQUIRED_LOCALIZED_LIST_FIELDS = [
    'highlights',
    'included',
    'notIncluded',
] as const;

const DESCRIPTION_TOUR_SCHEMA: JsonObject = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: {type: 'string'},
        cancellationType: {type: 'string'},
        imageAlt: {type: 'string'},
        aboutTourDescription: {type: 'string'},
        highlights: {type: 'array', items: {type: 'string'}},
        included: {type: 'array', items: {type: 'string'}},
        notIncluded: {type: 'array', items: {type: 'string'}},
        startPoint: {type: 'object'},
        endPoint: {type: 'object'},
        itineraryDescription: {type: 'string'},
    },
    required: [
        'title',
        'cancellationType',
        'highlights',
        'included',
        'notIncluded',
        'startPoint',
        'endPoint',
        'itineraryDescription',
    ],
};

const STOPS_TOUR_SCHEMA: JsonObject = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: {type: 'string'},
        cancellationType: {type: 'string'},
        imageAlt: {type: 'string'},
        aboutTourDescription: {type: 'string'},
        highlights: {type: 'array', items: {type: 'string'}},
        included: {type: 'array', items: {type: 'string'}},
        notIncluded: {type: 'array', items: {type: 'string'}},
        startPoint: {type: 'object'},
        endPoint: {type: 'object'},
        itineraryStops: {type: 'object'},
    },
    required: [
        'title',
        'cancellationType',
        'highlights',
        'included',
        'notIncluded',
        'startPoint',
        'endPoint',
        'itineraryStops',
    ],
};

export class ImportTourCatalog1710000000006 implements MigrationInterface {
    name = 'ImportTourCatalog1710000000006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const input = loadMigrationInput();
        await validateMigrationInput(input);

        const mediaAssetByRef = new Map(
            (input.mediaAssets ?? []).map((asset) => [asset.ref, asset]),
        );

        for (const language of input.languages ?? []) {
            await queryRunner.query(
                `
                    INSERT INTO "languages" ("code", "name", "is_enabled", "sort_order")
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT
                        ("code")
                    DO UPDATE
                    SET "name" = EXCLUDED."name",
                        "is_enabled" = EXCLUDED."is_enabled",
                        "sort_order" = EXCLUDED."sort_order",
                        "updated_at" = now()
                `,
                [
                    language.code,
                    language.name,
                    language.isEnabled ?? true,
                    language.sortOrder,
                ],
            );
        }

        for (const tag of input.tags ?? []) {
            await queryRunner.query(
                `
                    INSERT INTO "tags" ("key", "labels")
                    VALUES ($1, $2)
                    ON CONFLICT
                        ("key")
                    DO UPDATE
                    SET "labels" = EXCLUDED."labels",
                        "updated_at" = now()
                `,
                [tag.key, tag.labels],
            );
        }

        for (const mediaAsset of input.mediaAssets ?? []) {
            await queryRunner.query(
                `
                    INSERT INTO "media_assets" ("media_type",
                                                "storage_path",
                                                "content_type",
                                                "size",
                                                "original_filename",
                                                "created_by")
                    VALUES ($1, $2, $3, $4, $5, NULL)
                    ON CONFLICT
                        ("storage_path")
                    DO UPDATE
                    SET "media_type" = EXCLUDED."media_type",
                        "content_type" = EXCLUDED."content_type",
                        "size" = EXCLUDED."size",
                        "original_filename" = EXCLUDED."original_filename",
                        "updated_at" = now()
                `,
                [
                    mediaAsset.mediaType,
                    mediaAsset.storagePath,
                    mediaAsset.contentType,
                    mediaAsset.size,
                    mediaAsset.originalFilename,
                ],
            );
        }

        for (const tour of input.tours) {
            await queryRunner.query(
                `
                    INSERT INTO "tours" ("slug",
                                         "name",
                                         "cover_media_id",
                                         "content_schema",
                                         "price_amount",
                                         "price_currency",
                                         "rating",
                                         "review_count",
                                         "tour_type",
                                         "duration_minutes",
                                         "start_point",
                                         "end_point",
                                         "itinerary_variant",
                                         "created_by",
                                         "updated_by")
                    VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, NULL)
                    ON CONFLICT
                        ("slug")
                    DO UPDATE
                    SET "name" = EXCLUDED."name",
                        "content_schema" = EXCLUDED."content_schema",
                        "price_amount" = EXCLUDED."price_amount",
                        "price_currency" = EXCLUDED."price_currency",
                        "rating" = EXCLUDED."rating",
                        "review_count" = EXCLUDED."review_count",
                        "tour_type" = EXCLUDED."tour_type",
                        "duration_minutes" = EXCLUDED."duration_minutes",
                        "start_point" = EXCLUDED."start_point",
                        "end_point" = EXCLUDED."end_point",
                        "itinerary_variant" = EXCLUDED."itinerary_variant",
                        "updated_at" = now(),
                        "updated_by" = NULL
                `,
                [
                    tour.slug,
                    tour.name,
                    tour.contentSchema ?? null,
                    tour.price?.amount ?? null,
                    tour.price?.currency ?? null,
                    tour.rating ?? null,
                    tour.reviewCount ?? null,
                    tour.tourType,
                    tour.durationMinutes ?? null,
                    tour.startPoint ?? null,
                    tour.endPoint ?? null,
                    tour.itinerary?.variant ?? null,
                ],
            );

            const tourId = await getTourIdBySlug(queryRunner, tour.slug);

            await queryRunner.query(`DELETE
                                     FROM "tour_itinerary_stops"
                                     WHERE "tour_id" = $1`, [
                tourId,
            ]);

            if (tour.itinerary?.variant === 'stops') {
                for (const [orderIndex, stop] of (tour.itinerary.stops ?? []).entries()) {
                    await queryRunner.query(
                        `
                            INSERT INTO "tour_itinerary_stops" ("tour_id",
                                                                "stop_id",
                                                                "order_index",
                                                                "duration_minutes",
                                                                "coordinates",
                                                                "next_connection")
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `,
                        [
                            tourId,
                            stop.id,
                            orderIndex,
                            stop.durationMinutes ?? null,
                            stop.coordinates ?? null,
                            stop.nextConnection ?? null,
                        ],
                    );
                }
            }

            await queryRunner.query(`DELETE
                                     FROM "tour_tags"
                                     WHERE "tour_id" = $1`, [tourId]);
            for (const tagKey of tour.tagKeys ?? []) {
                await queryRunner.query(
                    `
                        INSERT INTO "tour_tags" ("tour_id", "tag_key")
                        VALUES ($1, $2)
                        ON CONFLICT
                            ("tour_id", "tag_key")
                        DO NOTHING
                    `,
                    [tourId, tagKey],
                );
            }

            await queryRunner.query(`UPDATE "tours"
                                     SET "cover_media_id" = NULL
                                     WHERE "id" = $1`, [
                tourId,
            ]);
            await queryRunner.query(`DELETE
                                     FROM "tour_media"
                                     WHERE "tour_id" = $1`, [tourId]);

            for (const mediaItem of tour.media?.items ?? []) {
                const mediaAsset = mediaAssetByRef.get(mediaItem.mediaRef);
                if (!mediaAsset) {
                    throw new Error(
                        `Tour "${ tour.ref }" references unknown media ref "${ mediaItem.mediaRef }".`,
                    );
                }

                const mediaId = await getMediaIdByStoragePath(queryRunner, mediaAsset.storagePath);
                await queryRunner.query(
                    `
                        INSERT INTO "tour_media" ("tour_id", "media_id", "order_index", "alt_text")
                        VALUES ($1, $2, $3, $4)
                    `,
                    [tourId, mediaId, mediaItem.orderIndex, mediaItem.altText ?? null],
                );
            }

            if (tour.media?.coverRef) {
                const coverAsset = mediaAssetByRef.get(tour.media.coverRef);
                if (!coverAsset) {
                    throw new Error(
                        `Tour "${ tour.ref }" references unknown coverRef "${ tour.media.coverRef }".`,
                    );
                }

                const coverMediaId = await getMediaIdByStoragePath(queryRunner, coverAsset.storagePath);
                await queryRunner.query(
                    `UPDATE "tours"
                     SET "cover_media_id" = $2,
                         "updated_at"     = now()
                     WHERE "id" = $1`,
                    [tourId, coverMediaId],
                );
            }

            for (const translation of tour.translations) {
                const isReady = calculateTranslationReadiness(tour, translation);
                await queryRunner.query(
                    `
                        INSERT INTO "tour_translations" ("tour_id",
                                                         "language_code",
                                                         "is_ready",
                                                         "is_published",
                                                         "booking_reference_id",
                                                         "payload")
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT
                            ("tour_id", "language_code")
                        DO UPDATE
                        SET "is_ready" = EXCLUDED."is_ready",
                            "is_published" = EXCLUDED."is_published",
                            "booking_reference_id" = EXCLUDED."booking_reference_id",
                            "payload" = EXCLUDED."payload",
                            "updated_at" = now()
                    `,
                    [
                        tourId,
                        translation.languageCode,
                        isReady,
                        translation.isPublished = isReady,
                        translation.bookingReferenceId ?? null,
                        translation.payload,
                    ],
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const input = loadMigrationInput();

        for (const tour of input.tours) {
            await queryRunner.query(`DELETE
                                     FROM "tours"
                                     WHERE "slug" = $1`, [tour.slug]);
        }

        for (const mediaAsset of input.mediaAssets ?? []) {
            await queryRunner.query(
                `
                    DELETE
                    FROM "media_assets"
                    WHERE "storage_path" = $1
                      AND NOT EXISTS (SELECT 1
                                      FROM "tour_media"
                                      WHERE "media_id" = "media_assets"."id")
                      AND NOT EXISTS (SELECT 1
                                      FROM "tours"
                                      WHERE "cover_media_id" = "media_assets"."id")
                      AND NOT EXISTS (SELECT 1
                                      FROM "blog_posts"
                                      WHERE "hero_media_id" = "media_assets"."id")
                `,
                [mediaAsset.storagePath],
            );
        }
    }
}

function loadMigrationInput(): MigrationInput {
    const inputPath = resolve(process.cwd(), 'src', 'database', 'migrations', 'tour-migration-input.json');
    const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as Partial<MigrationInput>;

    return normalizeInput(raw);
}

function normalizeInput(raw: Partial<MigrationInput>): MigrationInput {
    return {
        languages: raw.languages ?? [],
        tags: raw.tags ?? [],
        mediaAssets: raw.mediaAssets ?? [],
        tours: (raw.tours ?? []).map((tour) => ({
            ...tour,
            contentSchema:
                tour.contentSchema ??
                structuredClone(
                    tour.itinerary?.variant === 'stops' ? STOPS_TOUR_SCHEMA : DESCRIPTION_TOUR_SCHEMA,
                ),
            startPoint: tour.startPoint ?? {},
            endPoint: tour.endPoint ?? {},
            tagKeys: tour.tagKeys ?? [],
            media: {
                coverRef: tour.media?.coverRef,
                items: tour.media?.items ?? [],
            },
            translations: tour.translations ?? [],
        })) as TourInput[],
    };
}

async function validateMigrationInput(input: MigrationInput): Promise<void> {
    if (!Array.isArray(input.tours) || input.tours.length === 0) {
        throw new Error('tour-migration-input.json must contain at least one tour.');
    }

    const languageCodes = new Set((input.languages ?? []).map((language) => language.code));
    const tagKeys = new Set((input.tags ?? []).map((tag) => tag.key));
    const mediaRefs = new Set((input.mediaAssets ?? []).map((mediaAsset) => mediaAsset.ref));
    const seenRefs = new Set<string>();
    const seenSlugs = new Set<string>();
    const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
    });
    addFormats(ajv);

    for (const tour of input.tours) {
        if (seenRefs.has(tour.ref)) {
            throw new Error(`Duplicate tour ref "${ tour.ref }" in migration input.`);
        }
        seenRefs.add(tour.ref);

        if (seenSlugs.has(tour.slug)) {
            throw new Error(`Duplicate tour slug "${ tour.slug }" in migration input.`);
        }
        seenSlugs.add(tour.slug);

        for (const tagKey of tour.tagKeys ?? []) {
            if (!tagKeys.has(tagKey)) {
                throw new Error(`Tour "${ tour.ref }" references unknown tag key "${ tagKey }".`);
            }
        }

        if (tour.media?.coverRef && !mediaRefs.has(tour.media.coverRef)) {
            throw new Error(`Tour "${ tour.ref }" references unknown coverRef "${ tour.media.coverRef }".`);
        }

        if (
            tour.media?.coverRef &&
            !(tour.media.items ?? []).some((item) => item.mediaRef === tour.media?.coverRef)
        ) {
            throw new Error(
                `Tour "${ tour.ref }" must also attach coverRef "${ tour.media.coverRef }" in media.items.`,
            );
        }

        for (const mediaItem of tour.media?.items ?? []) {
            if (!mediaRefs.has(mediaItem.mediaRef)) {
                throw new Error(
                    `Tour "${ tour.ref }" references unknown media item ref "${ mediaItem.mediaRef }".`,
                );
            }
        }

        const stops = tour.itinerary?.stops ?? [];
        stops.forEach((stop, index) => {
            const isLast = index === stops.length - 1;
            if (isLast && stop.nextConnection) {
                throw new Error(
                    `Tour "${ tour.ref }" final stop "${ stop.id }" cannot define nextConnection.`,
                );
            }
        });

        const validatePayload = ajv.compile(tour.contentSchema ?? {});
        for (const translation of tour.translations) {
            if (!languageCodes.has(translation.languageCode)) {
                throw new Error(
                    `Tour "${ tour.ref }" references unknown language code "${ translation.languageCode }".`,
                );
            }

            if (!validatePayload(translation.payload)) {
                const message = (validatePayload.errors ?? [])
                    .map((error) => `${ error.instancePath || '/' } ${ error.message ?? 'is invalid' }`)
                    .join('; ');
                throw new Error(
                    `Tour "${ tour.ref }" translation "${ translation.languageCode }" payload is invalid: ${ message }`,
                );
            }
        }
    }
}

function calculateTranslationReadiness(
    tour: TourInput,
    translation: TranslationInput,
): boolean {
    const schema = tour.contentSchema;
    if (!schema) {
        return false;
    }

    const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
    });
    const validate = ajv.compile(schema);
    if (!validate(translation.payload)) {
        return false;
    }

    for (const field of REQUIRED_LOCALIZED_LIST_FIELDS) {
        const value = translation.payload[field];
        if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
            return false;
        }
    }

    if (tour.itinerary?.variant !== 'stops') {
        return true;
    }

    const itineraryStops = translation.payload.itineraryStops;
    if (!isObject(itineraryStops)) {
        return false;
    }

    for (const stop of tour.itinerary.stops ?? []) {
        const localizedStop = itineraryStops[stop.id];
        if (!isObject(localizedStop)) {
            return false;
        }

        if (
            typeof localizedStop.title !== 'string' ||
            typeof localizedStop.description !== 'string'
        ) {
            return false;
        }
    }

    return true;
}

async function getTourIdBySlug(queryRunner: QueryRunner, slug: string): Promise<string> {
    const rows = (await queryRunner.query(
        `SELECT "id"
         FROM "tours"
         WHERE "slug" = $1`,
        [slug],
    )) as Array<{ id: string }>;

    if (rows.length === 0) {
        throw new Error(`Tour "${ slug }" was not found after upsert.`);
    }

    return rows[0].id;
}

async function getMediaIdByStoragePath(
    queryRunner: QueryRunner,
    storagePath: string,
): Promise<string> {
    const rows = (await queryRunner.query(
        `SELECT "id"
         FROM "media_assets"
         WHERE "storage_path" = $1`,
        [storagePath],
    )) as Array<{ id: string }>;

    if (rows.length === 0) {
        throw new Error(`Media asset "${ storagePath }" was not found after upsert.`);
    }

    return rows[0].id;
}

function isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
