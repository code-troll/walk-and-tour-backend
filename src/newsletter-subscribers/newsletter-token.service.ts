import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class NewsletterTokenService {
  generateToken(): string {
    return randomBytes(24).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
