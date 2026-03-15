import { createHash, createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';

import { ProviderConfig } from '../shared/config/provider.config';
import {
  PutStoredObjectInput,
  StorageService,
  StoredObjectDescriptor,
} from './storage-service.interface';

interface FetchLike {
  (input: string, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    headers?: {
      get(name: string): string | null;
    };
  }>;
}

interface RailwayStorageCredentials {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  urlStyle: 'virtual-hosted' | 'path';
}

@Injectable()
export class RailwayS3StorageService implements StorageService {
  constructor(
    private readonly config: ProviderConfig,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async putObject(input: PutStoredObjectInput): Promise<StoredObjectDescriptor> {
    await this.sendSignedRequest({
      method: 'PUT',
      path: input.path,
      body: input.content,
      contentType: input.contentType,
    });

    return {
      path: input.path,
      contentType: input.contentType,
      size: input.content.length,
      publicUrl: this.getPublicUrl(input.path),
    };
  }

  async getObject(path: string): Promise<{ content: Buffer; contentType?: string }> {
    const response = await this.sendSignedRequest({
      method: 'GET',
      path,
    });

    return {
      content: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers?.get('content-type') ?? undefined,
    };
  }

  async deleteObject(path: string): Promise<void> {
    await this.sendSignedRequest({
      method: 'DELETE',
      path,
    });
  }

  getPublicUrl(path: string): string {
    const credentials = this.getCredentials();
    return this.buildObjectUrl(path, credentials).toString();
  }

  private async sendSignedRequest(input: {
    method: 'GET' | 'PUT' | 'DELETE';
    path: string;
    body?: Buffer;
    contentType?: string;
  }): Promise<Awaited<ReturnType<FetchLike>>> {
    const credentials = this.getCredentials();
    const url = this.buildObjectUrl(input.path, credentials);
    const payloadHash = sha256Hex(input.body ?? Buffer.alloc(0));
    const timestamp = this.now();
    const amzDate = formatAmzDate(timestamp);
    const dateStamp = amzDate.slice(0, 8);
    const canonicalHeaders = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    const signedHeaders = Object.keys(canonicalHeaders).sort().join(';');
    const canonicalRequest = [
      input.method,
      url.pathname,
      '',
      buildCanonicalHeaders(canonicalHeaders),
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${credentials.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');
    const signingKey = getSignatureKey(
      credentials.secretAccessKey,
      dateStamp,
      credentials.region,
      's3',
    );
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
    const response = await this.fetchImpl(url.toString(), {
      method: input.method,
      headers: {
        ...canonicalHeaders,
        ...(input.contentType ? { 'Content-Type': input.contentType } : {}),
        Authorization:
          `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, ` +
          `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body: input.body ? new Uint8Array(input.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Railway storage ${input.method.toLowerCase()} failed with status ${response.status}: ${await response.text()}`,
      );
    }

    return response;
  }

  private getCredentials(): RailwayStorageCredentials {
    const {
      railwayStorageEndpoint,
      railwayStorageAccessKeyId,
      railwayStorageSecretAccessKey,
      railwayStorageRegion,
      railwayStorageBucket,
      railwayStorageUrlStyle,
    } = this.config;

    if (
      !railwayStorageEndpoint ||
      !railwayStorageAccessKeyId ||
      !railwayStorageSecretAccessKey ||
      !railwayStorageBucket
    ) {
      throw new Error(
        'RAILWAY_STORAGE_ENDPOINT, RAILWAY_STORAGE_ACCESS_KEY_ID, RAILWAY_STORAGE_SECRET_ACCESS_KEY, and RAILWAY_STORAGE_BUCKET are required when STORAGE_DRIVER=railway.',
      );
    }

    return {
      endpoint: railwayStorageEndpoint,
      accessKeyId: railwayStorageAccessKeyId,
      secretAccessKey: railwayStorageSecretAccessKey,
      region: railwayStorageRegion,
      bucket: railwayStorageBucket,
      urlStyle: railwayStorageUrlStyle,
    };
  }

  private buildObjectUrl(path: string, credentials: RailwayStorageCredentials): URL {
    const baseUrl = new URL(credentials.endpoint);

    if (credentials.urlStyle === 'virtual-hosted') {
      baseUrl.hostname = `${credentials.bucket}.${baseUrl.hostname}`;
    }

    const prefixSegments = baseUrl.pathname
      .split('/')
      .filter((segment) => segment.length > 0)
      .map(encodeRfc3986);
    const objectSegments = path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map(encodeRfc3986);
    const pathnameSegments =
      credentials.urlStyle === 'path'
        ? [...prefixSegments, encodeRfc3986(credentials.bucket), ...objectSegments]
        : [...prefixSegments, ...objectSegments];

    baseUrl.pathname = `/${pathnameSegments.join('/')}`;
    return baseUrl;
  }
}

function buildCanonicalHeaders(headers: Record<string, string>): string {
  return `${Object.keys(headers)
    .sort()
    .map((key) => `${key}:${headers[key].trim()}`)
    .join('\n')}\n`;
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function getSignatureKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);
  return hmac(dateRegionServiceKey, 'aws4_request');
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
