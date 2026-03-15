import { mkdtemp, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { LocalFilesystemStorageService } from './local-filesystem-storage.service';

describe('LocalFilesystemStorageService', () => {
  it('writes files to the configured local root and returns a public url', async () => {
    const root = await mkdtemp(join(tmpdir(), 'walk-and-tour-storage-'));
    const service = new LocalFilesystemStorageService({
      appBaseUrl: 'https://backend.example.com',
      emailProvider: 'console',
      emailFrom: 'Walk and Tour <no-reply@example.com>',
      storageDriver: 'local',
      localStorageRoot: root,
      localStoragePublicBaseUrl: 'https://backend.example.com/media',
      railwayStorageRegion: 'auto',
      railwayStorageUrlStyle: 'virtual-hosted',
    });

    const result = await service.putObject({
      path: 'images/cover.txt',
      content: Buffer.from('hello'),
      contentType: 'text/plain',
    });

    expect(await readFile(join(root, 'images/cover.txt'), 'utf8')).toBe('hello');
    expect(result).toEqual({
      path: 'images/cover.txt',
      contentType: 'text/plain',
      size: 5,
      publicUrl: 'https://backend.example.com/media/images/cover.txt',
    });
  });
});
