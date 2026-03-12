import { BadRequestException, Injectable } from '@nestjs/common';

type JsonSchema = Record<string, unknown>;

const ALLOWED_SCHEMA_KEYS = new Set([
  '$schema',
  '$ref',
  '$defs',
  'title',
  'description',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'oneOf',
  'enum',
  'const',
  'minimum',
  'maximum',
  'format',
  'pattern',
]);

const ALLOWED_TYPES = new Set([
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
]);

@Injectable()
export class TourSchemaPolicyService {
  validateOrThrow(schema: unknown): JsonSchema {
    if (!this.isObject(schema)) {
      throw new BadRequestException('Tour contentSchema must be a JSON object.');
    }

    this.walkSchemaNode(schema, 'contentSchema');

    return schema;
  }

  createDraftSchema(schema: JsonSchema): JsonSchema {
    return this.cloneWithoutRequired(schema) as JsonSchema;
  }

  private walkSchemaNode(node: JsonSchema, path: string): void {
    for (const key of Object.keys(node)) {
      if (!ALLOWED_SCHEMA_KEYS.has(key)) {
        throw new BadRequestException(`Schema key "${path}.${key}" is not allowed in v1.`);
      }
    }

    const type = node.type;
    if (type !== undefined) {
      if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) {
        throw new BadRequestException(`Schema node "${path}.type" must use the supported subset.`);
      }
    }

    if ('required' in node) {
      const required = node.required;

      if (!Array.isArray(required) || required.some((entry) => typeof entry !== 'string')) {
        throw new BadRequestException(`Schema node "${path}.required" must be an array of strings.`);
      }
    }

    if ('enum' in node) {
      const values = node.enum;

      if (!Array.isArray(values) || values.some((entry) => typeof entry !== 'string')) {
        throw new BadRequestException(`Schema node "${path}.enum" must be an array of strings.`);
      }
    }

    if ('properties' in node) {
      const properties = node.properties;

      if (!this.isObject(properties)) {
        throw new BadRequestException(`Schema node "${path}.properties" must be an object.`);
      }

      for (const [propertyKey, propertySchema] of Object.entries(properties)) {
        if (!this.isObject(propertySchema)) {
          throw new BadRequestException(
            `Schema property "${path}.properties.${propertyKey}" must be an object.`,
          );
        }

        this.walkSchemaNode(propertySchema, `${path}.properties.${propertyKey}`);
      }
    }

    if ('items' in node) {
      const items = node.items;

      if (!this.isObject(items)) {
        throw new BadRequestException(`Schema node "${path}.items" must be an object.`);
      }

      this.walkSchemaNode(items, `${path}.items`);
    }

    if ('oneOf' in node) {
      const oneOf = node.oneOf;

      if (!Array.isArray(oneOf) || oneOf.length === 0) {
        throw new BadRequestException(`Schema node "${path}.oneOf" must be a non-empty array.`);
      }

      oneOf.forEach((entry, index) => {
        if (!this.isObject(entry)) {
          throw new BadRequestException(`Schema node "${path}.oneOf[${index}]" must be an object.`);
        }

        this.walkSchemaNode(entry, `${path}.oneOf[${index}]`);
      });
    }

    if ('$defs' in node) {
      const defs = node.$defs;

      if (!this.isObject(defs)) {
        throw new BadRequestException(`Schema node "${path}.$defs" must be an object.`);
      }

      for (const [defKey, defSchema] of Object.entries(defs)) {
        if (!this.isObject(defSchema)) {
          throw new BadRequestException(`Schema node "${path}.$defs.${defKey}" must be an object.`);
        }

        this.walkSchemaNode(defSchema, `${path}.$defs.${defKey}`);
      }
    }

    if ('additionalProperties' in node) {
      const additionalProperties = node.additionalProperties;

      if (
        typeof additionalProperties !== 'boolean' &&
        !this.isObject(additionalProperties)
      ) {
        throw new BadRequestException(
          `Schema node "${path}.additionalProperties" must be a boolean or schema object.`,
        );
      }

      if (this.isObject(additionalProperties)) {
        this.walkSchemaNode(additionalProperties, `${path}.additionalProperties`);
      }
    }
  }

  private cloneWithoutRequired(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.cloneWithoutRequired(entry));
    }

    if (!this.isObject(value)) {
      return value;
    }

    const clone: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === 'required') {
        continue;
      }

      clone[key] = this.cloneWithoutRequired(nestedValue);
    }

    return clone;
  }

  private isObject(value: unknown): value is JsonSchema {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
