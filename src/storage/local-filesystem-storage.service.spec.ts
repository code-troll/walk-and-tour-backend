import { mkdtemp, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { LocalFilesystemStorageService } from './local-filesystem-storage.service';
import { createProviderConfigMock } from '../../test/utils/provider-config.mock';

describe('LocalFilesystemStorageService', () => {
  it('writes files to the configured local root and returns a public url', async () => {
    const root = await mkdtemp(join(tmpdir(), 'walk-and-tour-storage-'));
    const service = new LocalFilesystemStorageService(createProviderConfigMock({
      emailProvider: 'console',
      storageDriver: 'local',
      localStorageRoot: root,
      railwayStorageUrlStyle: 'virtual-hosted',
      railwayStorageRegion: 'auto',
      localStoragePublicBaseUrl: 'https://backend.example.com/media',
    }));

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
