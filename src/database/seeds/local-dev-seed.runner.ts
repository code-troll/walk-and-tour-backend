import type { AdminUserEntity } from '../../admin-users/admin-user.entity';
import type { BlogPostsService } from '../../blog-posts/blog-posts.service';
import type { LanguageEntity } from '../../languages/language.entity';
import type { NewsletterSubscriberEntity } from '../../newsletter-subscribers/newsletter-subscriber.entity';
import type { NewsletterTokenService } from '../../newsletter-subscribers/newsletter-token.service';
import type { TagsService } from '../../tags/tags.service';
import type { ToursService } from '../../tours/tours.service';

const SEEDED_ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const SEEDED_ADMIN_EMAIL = 'admin@example.com';

const PENDING_CONFIRMATION_TOKEN =
  '111111111111111111111111111111111111111111111111';
const ACTIVE_UNSUBSCRIBE_TOKEN =
  '222222222222222222222222222222222222222222222222';
const UNSUBSCRIBED_TOKEN =
  '333333333333333333333333333333333333333333333333';

const RESET_SQL = `
  TRUNCATE TABLE
    "newsletter_subscribers",
    "blog_post_tags",
    "blog_post_translations",
    "blog_posts",
    "tour_tags",
    "tour_translations",
    "tour_itinerary_stops",
    "tours",
    "tags",
    "admin_users"
  RESTART IDENTITY CASCADE
`;

const SEEDED_LANGUAGES = [
  { code: 'en', name: 'English', isEnabled: true, sortOrder: 1 },
  { code: 'es', name: 'Spanish', isEnabled: true, sortOrder: 2 },
  { code: 'it', name: 'Italian', isEnabled: true, sortOrder: 3 },
];

const SEEDED_TAGS = [
  {
    key: 'history',
    labels: { en: 'History', es: 'Historia', it: 'Storia' },
  },
  {
    key: 'architecture',
    labels: { en: 'Architecture', es: 'Arquitectura', it: 'Architettura' },
  },
  {
    key: 'food',
    labels: { en: 'Food', es: 'Comida', it: 'Cibo' },
  },
  {
    key: 'nightlife',
    labels: { en: 'Nightlife', es: 'Vida nocturna', it: 'Vita notturna' },
  },
  {
    key: 'family-friendly',
    labels: {
      en: 'Family Friendly',
      es: 'Familiar',
      it: 'Adatto alle famiglie',
    },
  },
  {
    key: 'gaudi',
    labels: { en: 'Gaudi', es: 'Gaudi', it: 'Gaudi' },
  },
  {
    key: 'waterfront',
    labels: { en: 'Waterfront', es: 'Frente maritimo', it: 'Lungomare' },
  },
  {
    key: 'local-life',
    labels: { en: 'Local Life', es: 'Vida local', it: 'Vita locale' },
  },
];

const DESCRIPTION_TOUR_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    shortDescription: { type: 'string' },
    startPoint: { type: 'object' },
    endPoint: { type: 'object' },
    itineraryDescription: { type: 'string' },
  },
  required: [
    'title',
    'shortDescription',
    'startPoint',
    'endPoint',
    'itineraryDescription',
  ],
};

const STOPS_TOUR_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    shortDescription: { type: 'string' },
    startPoint: { type: 'object' },
    endPoint: { type: 'object' },
    itineraryStops: { type: 'object' },
  },
  required: ['title', 'shortDescription', 'startPoint', 'endPoint', 'itineraryStops'],
};

const SEEDED_TOURS = [
  {
    slug: 'historic-center-highlights',
    category: 'walking',
    coverMediaRef: 'tours/historic-center-highlights/cover.jpg',
    galleryMediaRefs: [
      'tours/historic-center-highlights/gallery-1.jpg',
      'tours/historic-center-highlights/gallery-2.jpg',
    ],
    publicationStatus: 'published',
    isHidden: false,
    contentSchema: DESCRIPTION_TOUR_SCHEMA,
    price: { amount: 29, currency: 'EUR' },
    rating: 4.8,
    reviewCount: 186,
    tourType: 'group',
    cancellationType: '24h_free_cancellation',
    durationMinutes: 150,
    startPoint: { coordinates: { lat: 41.3874, lng: 2.1686 } },
    endPoint: { coordinates: { lat: 41.3811, lng: 2.1764 } },
    itinerary: { variant: 'description' as const },
    tagKeys: ['history', 'architecture', 'family-friendly'],
    translations: [
      {
        languageCode: 'en',
        translationStatus: 'ready',
        publicationStatus: 'published',
        isHidden: false,
        bookingReferenceId: 'historic-center-en',
        payload: {
          title: 'Historic Center Highlights',
          shortDescription: 'A polished introduction to the old city.',
          startPoint: { label: 'Plaça de Catalunya' },
          endPoint: { label: 'Barcelona Cathedral' },
          itineraryDescription:
            'Follow Roman, medieval, and civic landmarks through the dense heart of Barcelona.',
        },
      },
      {
        languageCode: 'es',
        translationStatus: 'ready',
        publicationStatus: 'published',
        isHidden: false,
        bookingReferenceId: 'historic-center-es',
        payload: {
          title: 'Lo Mejor del Centro Historico',
          shortDescription: 'Una introduccion cuidada al casco antiguo.',
          startPoint: { label: 'Plaça de Catalunya' },
          endPoint: { label: 'Catedral de Barcelona' },
          itineraryDescription:
            'Recorre hitos romanos, medievales y civicos por el corazon del casco antiguo.',
        },
      },
      {
        languageCode: 'it',
        translationStatus: 'ready',
        publicationStatus: 'published',
        isHidden: false,
        bookingReferenceId: 'historic-center-it',
        payload: {
          title: 'Il Meglio del Centro Storico',
          shortDescription: 'Una introduzione curata al centro antico.',
          startPoint: { label: 'Plaça de Catalunya' },
          endPoint: { label: 'Cattedrale di Barcellona' },
          itineraryDescription:
            'Attraversa punti di interesse romani, medievali e civici nel cuore della citta vecchia.',
        },
      },
    ],
  },
  {
    slug: 'gaudi-and-modernisme-route',
    category: 'architecture',
    coverMediaRef: 'tours/gaudi-and-modernisme-route/cover.jpg',
    galleryMediaRefs: ['tours/gaudi-and-modernisme-route/gallery-1.jpg'],
    publicationStatus: 'published',
    isHidden: false,
    contentSchema: STOPS_TOUR_SCHEMA,
    price: { amount: 34, currency: 'EUR' },
    rating: 4.9,
    reviewCount: 241,
    tourType: 'private',
    cancellationType: '48h_free_cancellation',
    durationMinutes: 180,
    startPoint: { coordinates: { lat: 41.3917, lng: 2.1649 } },
    endPoint: { coordinates: { lat: 41.4036, lng: 2.1744 } },
    itinerary: {
      variant: 'stops' as const,
      stops: [
        {
          id: 'casa-batllo',
          durationMinutes: 25,
          coordinates: { lat: 41.3917, lng: 2.1649 },
          nextConnection: { commuteMode: 'walk', durationMinutes: 12 },
        },
        {
          id: 'la-pedrera',
          durationMinutes: 25,
          coordinates: { lat: 41.3954, lng: 2.1619 },
          nextConnection: { commuteMode: 'walk', durationMinutes: 22 },
        },
        {
          id: 'sagrada-familia',
          durationMinutes: 40,
          coordinates: { lat: 41.4036, lng: 2.1744 },
        },
      ],
    },
    tagKeys: ['architecture', 'gaudi', 'history'],
    translations: [
      {
        languageCode: 'en',
        translationStatus: 'ready',
        publicationStatus: 'published',
        isHidden: false,
        bookingReferenceId: 'gaudi-route-en',
        payload: {
          title: 'Gaudi and Modernisme Route',
          shortDescription: 'A stop-based tour across Barcelona modernist icons.',
          startPoint: { label: 'Casa Batllo' },
          endPoint: { label: 'Sagrada Familia' },
          itineraryStops: {
            'casa-batllo': {
              title: 'Casa Batllo',
              description: 'Open the route with one of Gaudi’s most theatrical facades.',
            },
            'la-pedrera': {
              title: 'La Pedrera',
              description: 'Compare structural experimentation and rooftop storytelling.',
            },
            'sagrada-familia': {
              title: 'Sagrada Familia',
              description: 'Finish with the city’s most ambitious unfinished basilica.',
            },
          },
        },
      },
      {
        languageCode: 'es',
        translationStatus: 'draft',
        publicationStatus: 'unpublished',
        isHidden: false,
        bookingReferenceId: 'gaudi-route-es',
        payload: {
          title: 'Ruta Gaudi y Modernismo',
          shortDescription: 'Un recorrido por los iconos modernistas.',
          startPoint: { label: 'Casa Batllo' },
          endPoint: { label: 'Sagrada Familia' },
          itineraryStops: {
            'casa-batllo': {
              title: 'Casa Batllo',
              description: 'Abre la ruta con una de las fachadas mas teatrales de Gaudi.',
            },
          },
        },
      },
      {
        languageCode: 'it',
        translationStatus: 'ready',
        publicationStatus: 'published',
        isHidden: false,
        bookingReferenceId: 'gaudi-route-it',
        payload: {
          title: 'Percorso Gaudi e Modernismo',
          shortDescription: 'Un itinerario a tappe tra i grandi simboli modernisti.',
          startPoint: { label: 'Casa Batllo' },
          endPoint: { label: 'Sagrada Familia' },
          itineraryStops: {
            'casa-batllo': {
              title: 'Casa Batllo',
              description: 'Apri il percorso con una delle facciate piu scenografiche di Gaudi.',
            },
            'la-pedrera': {
              title: 'La Pedrera',
              description: 'Confronta sperimentazione strutturale e racconto urbano.',
            },
            'sagrada-familia': {
              title: 'Sagrada Familia',
              description: 'Chiudi con la basilica incompiuta piu iconica della citta.',
            },
          },
        },
      },
    ],
  },
  {
    slug: 'born-after-dark',
    category: 'nightlife',
    coverMediaRef: 'tours/born-after-dark/cover.jpg',
    galleryMediaRefs: ['tours/born-after-dark/gallery-1.jpg'],
    publicationStatus: 'published',
    isHidden: true,
    contentSchema: DESCRIPTION_TOUR_SCHEMA,
    price: { amount: 22, currency: 'EUR' },
    rating: 4.6,
    reviewCount: 59,
    tourType: 'group',
    cancellationType: '12h_free_cancellation',
    durationMinutes: 120,
    startPoint: { coordinates: { lat: 41.3857, lng: 2.1827 } },
    endPoint: { coordinates: { lat: 41.3842, lng: 2.1813 } },
    itinerary: { variant: 'description' as const },
    tagKeys: ['nightlife', 'local-life', 'food'],
    translations: [
      {
        languageCode: 'en',
        translationStatus: 'ready',
        publicationStatus: 'published',
        isHidden: false,
        bookingReferenceId: 'born-after-dark-en',
        payload: {
          title: 'Born After Dark',
          shortDescription: 'A hidden tour for admin-only availability testing.',
          startPoint: { label: 'Mercat del Born' },
          endPoint: { label: 'Passeig del Born' },
          itineraryDescription:
            'Trace the neighborhood through bars, plazas, and late-night local routines.',
        },
      },
    ],
  },
  {
    slug: 'barceloneta-sunset-tip-tour',
    category: 'waterfront',
    coverMediaRef: 'tours/barceloneta-sunset-tip-tour/cover.jpg',
    galleryMediaRefs: ['tours/barceloneta-sunset-tip-tour/gallery-1.jpg'],
    publicationStatus: 'draft',
    isHidden: false,
    contentSchema: DESCRIPTION_TOUR_SCHEMA,
    rating: 4.7,
    reviewCount: 32,
    tourType: 'tip_based',
    cancellationType: '24h_free_cancellation',
    durationMinutes: 90,
    startPoint: { coordinates: { lat: 41.375, lng: 2.1906 } },
    endPoint: { coordinates: { lat: 41.3792, lng: 2.1948 } },
    itinerary: { variant: 'description' as const },
    tagKeys: ['waterfront', 'local-life', 'family-friendly'],
    translations: [
      {
        languageCode: 'en',
        translationStatus: 'draft',
        publicationStatus: 'unpublished',
        isHidden: false,
        payload: {
          title: 'Barceloneta Sunset Tip Tour',
          startPoint: { label: 'Barceloneta Beach' },
        },
      },
    ],
  },
];

const SEEDED_BLOG_POSTS = [
  {
    slug: 'barcelona-historic-center-guide',
    heroMediaRef: 'blog/barcelona-historic-center-guide/hero.jpg',
    category: 'city-guides',
    publicationStatus: 'published',
    tagKeys: ['history', 'architecture', 'family-friendly'],
    translations: [
      {
        languageCode: 'en',
        publicationStatus: 'published',
        title: 'Barcelona Historic Center Guide',
        summary: 'A practical guide to moving through the old city.',
        htmlContent:
          '<p>Explore Roman foundations, Gothic lanes, and civic landmarks in one compact walk.</p>',
        seoTitle: 'Barcelona Historic Center Guide',
        seoDescription: 'Discover the core landmarks of Barcelona’s old city.',
        imageRefs: ['blog/barcelona-historic-center-guide/en-1.jpg'],
      },
      {
        languageCode: 'es',
        publicationStatus: 'published',
        title: 'Guia del Centro Historico de Barcelona',
        summary: 'Una guia practica para recorrer el casco antiguo.',
        htmlContent:
          '<p>Recorre restos romanos, calles goticas y grandes hitos civicos en un solo paseo.</p>',
        seoTitle: 'Guia del Centro Historico de Barcelona',
        seoDescription: 'Descubre los puntos clave del casco antiguo de Barcelona.',
        imageRefs: ['blog/barcelona-historic-center-guide/es-1.jpg'],
      },
      {
        languageCode: 'it',
        publicationStatus: 'published',
        title: 'Guida al Centro Storico di Barcellona',
        summary: 'Una guida pratica per attraversare la citta vecchia.',
        htmlContent:
          '<p>Attraversa tracce romane, vicoli gotici e grandi luoghi civici in una sola passeggiata.</p>',
        seoTitle: 'Guida al Centro Storico di Barcellona',
        seoDescription: 'Scopri i punti chiave della citta vecchia di Barcellona.',
        imageRefs: ['blog/barcelona-historic-center-guide/it-1.jpg'],
      },
    ],
  },
  {
    slug: 'best-tapas-after-your-tour',
    heroMediaRef: 'blog/best-tapas-after-your-tour/hero.jpg',
    category: 'food',
    publicationStatus: 'published',
    tagKeys: ['food', 'local-life'],
    translations: [
      {
        languageCode: 'en',
        publicationStatus: 'published',
        title: 'Best Tapas After Your Tour',
        summary: 'Three neighborhoods worth staying in after the walking route ends.',
        htmlContent:
          '<p>Stay for vermouth, seafood, and classic tapas after the official itinerary wraps up.</p>',
        seoTitle: 'Best Tapas After Your Tour',
        seoDescription: 'Neighborhood recommendations for post-tour food stops.',
        imageRefs: ['blog/best-tapas-after-your-tour/en-1.jpg'],
      },
      {
        languageCode: 'es',
        publicationStatus: 'unpublished',
        title: 'Las Mejores Tapas Despues del Tour',
        summary: 'Barrios recomendados para seguir la tarde.',
        htmlContent:
          '<p>Quedate para probar vermut, marisco y tapas clasicas despues de la ruta.</p>',
        seoTitle: 'Las Mejores Tapas Despues del Tour',
        seoDescription: 'Recomendaciones para comer tras el tour.',
        imageRefs: ['blog/best-tapas-after-your-tour/es-1.jpg'],
      },
    ],
  },
  {
    slug: 'behind-the-scenes-tour-planning',
    heroMediaRef: 'blog/behind-the-scenes-tour-planning/hero.jpg',
    category: 'editorial',
    publicationStatus: 'draft',
    tagKeys: ['local-life'],
    translations: [
      {
        languageCode: 'en',
        publicationStatus: 'unpublished',
        title: 'Behind the Scenes of Tour Planning',
        summary: 'An internal editorial draft for admin previews.',
        htmlContent:
          '<p>This draft explains how routes are revised for seasonal operations and guide feedback.</p>',
        seoTitle: 'Behind the Scenes of Tour Planning',
        seoDescription: 'Editorial draft for admin preview testing.',
        imageRefs: ['blog/behind-the-scenes-tour-planning/en-1.jpg'],
      },
    ],
  },
];

const SEEDED_NEWSLETTER_SUBSCRIBERS = [
  {
    email: 'pending.confirmation@example.com',
    subscriptionStatus: 'pending_confirmation',
    preferredLocale: 'en',
    consentSource: 'footer_form',
    sourceMetadata: { page: '/', campaign: 'spring-launch' },
    consentedAt: new Date('2026-03-10T09:00:00.000Z'),
    confirmedAt: null,
    unsubscribedAt: null,
    confirmationToken: PENDING_CONFIRMATION_TOKEN,
    unsubscribeToken: ACTIVE_UNSUBSCRIBE_TOKEN,
  },
  {
    email: 'active.subscriber@example.com',
    subscriptionStatus: 'subscribed',
    preferredLocale: 'es',
    consentSource: 'blog_sidebar',
    sourceMetadata: { page: '/blog/barcelona-historic-center-guide' },
    consentedAt: new Date('2026-03-05T09:00:00.000Z'),
    confirmedAt: new Date('2026-03-05T10:00:00.000Z'),
    unsubscribedAt: null,
    confirmationToken: null,
    unsubscribeToken: ACTIVE_UNSUBSCRIBE_TOKEN,
  },
  {
    email: 'former.subscriber@example.com',
    subscriptionStatus: 'unsubscribed',
    preferredLocale: 'it',
    consentSource: 'landing_page',
    sourceMetadata: { page: '/newsletter' },
    consentedAt: new Date('2026-02-01T09:00:00.000Z'),
    confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
    unsubscribedAt: new Date('2026-02-12T11:00:00.000Z'),
    confirmationToken: null,
    unsubscribeToken: UNSUBSCRIBED_TOKEN,
  },
  {
    email: 'marketing.demo@example.com',
    subscriptionStatus: 'subscribed',
    preferredLocale: 'en',
    consentSource: 'tour_checkout_teaser',
    sourceMetadata: { campaign: 'local-demo' },
    consentedAt: new Date('2026-03-01T12:00:00.000Z'),
    confirmedAt: new Date('2026-03-01T12:10:00.000Z'),
    unsubscribedAt: null,
    confirmationToken: null,
    unsubscribeToken: ACTIVE_UNSUBSCRIBE_TOKEN,
  },
  {
    email: 'italian.pending@example.com',
    subscriptionStatus: 'pending_confirmation',
    preferredLocale: 'it',
    consentSource: 'footer_form',
    sourceMetadata: { page: '/it' },
    consentedAt: new Date('2026-03-11T08:30:00.000Z'),
    confirmedAt: null,
    unsubscribedAt: null,
    confirmationToken:
      '444444444444444444444444444444444444444444444444',
    unsubscribeToken:
      '555555555555555555555555555555555555555555555555',
  },
];

export interface LocalDevSeedSummary {
  adminEmail: string;
  tags: number;
  tours: number;
  blogPosts: number;
  newsletterSubscribers: number;
  pendingConfirmationToken: string;
  activeUnsubscribeToken: string;
  unsubscribedToken: string;
}

export interface LocalDevSeedDependencies {
  dataSource: { query: (query: string) => Promise<unknown> };
  languagesRepository: {
    save: (
      values: Array<Partial<LanguageEntity>>,
    ) => Promise<LanguageEntity[] | LanguageEntity>;
  };
  adminUsersRepository: {
    save: (
      value: Partial<AdminUserEntity>,
    ) => Promise<AdminUserEntity>;
  };
  newsletterSubscribersRepository: {
    save: (
      values: Array<Partial<NewsletterSubscriberEntity>>,
    ) => Promise<NewsletterSubscriberEntity[] | NewsletterSubscriberEntity>;
  };
  tagsService: Pick<TagsService, 'create'>;
  toursService: Pick<ToursService, 'create'>;
  blogPostsService: Pick<BlogPostsService, 'create'>;
  newsletterTokenService: Pick<NewsletterTokenService, 'hashToken'>;
}

export class LocalDevSeedRunner {
  constructor(private readonly deps: LocalDevSeedDependencies) {}

  async run(): Promise<LocalDevSeedSummary> {
    await this.resetAppData();
    await this.ensureLanguages();

    const seededAdmin = await this.seedAdminUser();
    const actor = {
      id: seededAdmin.id,
      email: seededAdmin.email,
      roleName: 'super_admin' as const,
      status: 'active' as const,
      auth0UserId: seededAdmin.auth0UserId,
    };

    await this.seedTags();
    await this.seedTours(actor);
    await this.seedBlogPosts(actor);
    await this.seedNewsletterSubscribers();

    return {
      adminEmail: SEEDED_ADMIN_EMAIL,
      tags: SEEDED_TAGS.length,
      tours: SEEDED_TOURS.length,
      blogPosts: SEEDED_BLOG_POSTS.length,
      newsletterSubscribers: SEEDED_NEWSLETTER_SUBSCRIBERS.length,
      pendingConfirmationToken: PENDING_CONFIRMATION_TOKEN,
      activeUnsubscribeToken: ACTIVE_UNSUBSCRIBE_TOKEN,
      unsubscribedToken: UNSUBSCRIBED_TOKEN,
    };
  }

  private async resetAppData(): Promise<void> {
    await this.deps.dataSource.query(RESET_SQL);
  }

  private async ensureLanguages(): Promise<void> {
    await this.deps.languagesRepository.save(SEEDED_LANGUAGES);
  }

  private async seedAdminUser(): Promise<AdminUserEntity> {
    return this.deps.adminUsersRepository.save({
      id: SEEDED_ADMIN_ID,
      email: SEEDED_ADMIN_EMAIL,
      roleName: 'super_admin',
      auth0UserId: null,
      status: 'active',
      lastLoginAt: null,
    });
  }

  private async seedTags(): Promise<void> {
    for (const tag of SEEDED_TAGS) {
      await this.deps.tagsService.create(tag);
    }
  }

  private async seedTours(actor: SeedActor): Promise<void> {
    for (const tour of SEEDED_TOURS) {
      await this.deps.toursService.create(tour, actor);
    }
  }

  private async seedBlogPosts(actor: SeedActor): Promise<void> {
    for (const blogPost of SEEDED_BLOG_POSTS) {
      await this.deps.blogPostsService.create(blogPost, actor);
    }
  }

  private async seedNewsletterSubscribers(): Promise<void> {
    await this.deps.newsletterSubscribersRepository.save(
      SEEDED_NEWSLETTER_SUBSCRIBERS.map((subscriber) => ({
        email: subscriber.email,
        subscriptionStatus: subscriber.subscriptionStatus,
        preferredLocale: subscriber.preferredLocale,
        consentSource: subscriber.consentSource,
        sourceMetadata: subscriber.sourceMetadata,
        consentedAt: subscriber.consentedAt,
        confirmedAt: subscriber.confirmedAt,
        unsubscribedAt: subscriber.unsubscribedAt,
        confirmationTokenHash: subscriber.confirmationToken
          ? this.deps.newsletterTokenService.hashToken(
              subscriber.confirmationToken,
            )
          : null,
        unsubscribeTokenHash: subscriber.unsubscribeToken
          ? this.deps.newsletterTokenService.hashToken(
              subscriber.unsubscribeToken,
            )
          : null,
      })),
    );
  }
}

type SeedActor = {
  id: string;
  email: string;
  roleName: 'super_admin';
  status: 'active';
  auth0UserId: string | null;
};

export function getLocalDevSeedConstants() {
  return {
    adminEmail: SEEDED_ADMIN_EMAIL,
    pendingConfirmationToken: PENDING_CONFIRMATION_TOKEN,
    activeUnsubscribeToken: ACTIVE_UNSUBSCRIBE_TOKEN,
    unsubscribedToken: UNSUBSCRIBED_TOKEN,
    tags: SEEDED_TAGS,
    tours: SEEDED_TOURS,
    blogPosts: SEEDED_BLOG_POSTS,
    newsletterSubscribers: SEEDED_NEWSLETTER_SUBSCRIBERS,
  };
}

export const LOCAL_DEV_SEED_RESET_SQL = RESET_SQL;
