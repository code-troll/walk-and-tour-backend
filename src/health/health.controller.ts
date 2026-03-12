import { Controller, Get } from '@nestjs/common';

import { getAppConfig } from '../shared/config/app.config';
import {
  ADMIN_ROLES,
  BLOG_PUBLICATION_STATUSES,
  NEWSLETTER_SUBSCRIPTION_STATUSES,
  SUPPORTED_LANGUAGE_CODES,
  TOUR_CANCELLATION_TYPES,
  TOUR_COMMUTE_MODES,
  TOUR_PUBLICATION_STATUSES,
  TOUR_TRANSLATION_PUBLICATION_STATUSES,
  TOUR_TRANSLATION_STATUSES,
  TOUR_TYPES,
} from '../shared/domain';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    const config = getAppConfig();

    return {
      status: 'ok',
      app: config.appName,
      environment: config.nodeEnv,
      foundation: {
        adminRoles: ADMIN_ROLES,
        supportedLanguageCodes: SUPPORTED_LANGUAGE_CODES,
        tourPublicationStatuses: TOUR_PUBLICATION_STATUSES,
        tourTranslationStatuses: TOUR_TRANSLATION_STATUSES,
        tourTranslationPublicationStatuses:
          TOUR_TRANSLATION_PUBLICATION_STATUSES,
        tourTypes: TOUR_TYPES,
        tourCancellationTypes: TOUR_CANCELLATION_TYPES,
        tourCommuteModes: TOUR_COMMUTE_MODES,
        blogPublicationStatuses: BLOG_PUBLICATION_STATUSES,
        newsletterSubscriptionStatuses: NEWSLETTER_SUBSCRIPTION_STATUSES,
      },
    };
  }
}
