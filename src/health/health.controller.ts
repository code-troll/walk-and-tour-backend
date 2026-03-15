import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { getAppConfig } from '../shared/config/app.config';
import {
  ADMIN_ROLES,
  NEWSLETTER_SUBSCRIPTION_STATUSES,
  SUPPORTED_LANGUAGE_CODES,
  TOUR_COMMUTE_MODES,
  TOUR_TYPES,
} from '../shared/domain';
import { HealthResponseDto } from '../swagger/swagger.models';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @ApiOperation({
    summary: 'Get service health and foundation vocabulary',
    description:
      'Returns a simple liveness payload together with the shared enum vocabularies currently compiled into the backend.',
  })
  @ApiOkResponse({
    description: 'Foundation health payload.',
    type: HealthResponseDto,
  })
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
        tourTypes: TOUR_TYPES,
        tourCommuteModes: TOUR_COMMUTE_MODES,
        newsletterSubscriptionStatuses: NEWSLETTER_SUBSCRIPTION_STATUSES,
      },
    };
  }
}
