import { BadRequestException, Injectable } from '@nestjs/common';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class TourPayloadValidationService {
  private readonly ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
    });
    addFormats(this.ajv);
  }

  validateOrThrow(schema: Record<string, unknown>, payload: Record<string, unknown>): void {
    const validate = this.ajv.compile(schema);
    const isValid = validate(payload);

    if (!isValid) {
      throw new BadRequestException(this.formatErrors(validate.errors ?? []));
    }
  }

  private formatErrors(errors: ErrorObject[]): string {
    const messages = errors.map((error) => {
      const location = error.instancePath || '/';
      return `${location} ${error.message ?? 'is invalid'}`.trim();
    });

    return `Tour translation payload validation failed: ${messages.join('; ')}`;
  }
}
