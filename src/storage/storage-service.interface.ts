export interface PutStoredObjectInput {
  path: string;
  content: Buffer;
  contentType: string;
}

export interface StoredObjectDescriptor {
  path: string;
  contentType: string;
  size: number;
  publicUrl: string;
}

export interface StorageService {
  putObject(input: PutStoredObjectInput): Promise<StoredObjectDescriptor>;
  deleteObject(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
