import { ProposalVersionEntity } from './entities/proposal-version.entity';

describe('ProposalVersionEntity date and duration fields', () => {
  it('should accept tourDate as a Date', () => {
    const version = new ProposalVersionEntity();
    version.tourDate = new Date('2026-06-15T10:00:00Z');
    expect(version.tourDate).toBeInstanceOf(Date);
  });

  it('should accept null tourDate', () => {
    const version = new ProposalVersionEntity();
    version.tourDate = null;
    expect(version.tourDate).toBeNull();
  });

  it('should accept durationMinutes as a number', () => {
    const version = new ProposalVersionEntity();
    version.durationMinutes = 180;
    expect(version.durationMinutes).toBe(180);
  });

  it('should accept null durationMinutes', () => {
    const version = new ProposalVersionEntity();
    version.durationMinutes = null;
    expect(version.durationMinutes).toBeNull();
  });
});

describe('version body serialization', () => {
  const buildVersionBody = (v: { tourDate: string; durationMinutes: string }) => {
    const body: Record<string, unknown> = {};
    if (v.tourDate) body.tourDate = new Date(v.tourDate).toISOString();
    if (v.durationMinutes !== '') body.durationMinutes = Number(v.durationMinutes);
    return body;
  };

  it('includes tourDate as ISO string and durationMinutes in JSON when set', () => {
    const body = buildVersionBody({ tourDate: '2026-06-15T10:00', durationMinutes: '180' });
    const json = JSON.parse(JSON.stringify(body));
    expect(json.tourDate).toContain('2026-06-15');
    expect(json.durationMinutes).toBe(180);
  });

  it('excludes tourDate and durationMinutes from JSON when empty', () => {
    const body = buildVersionBody({ tourDate: '', durationMinutes: '' });
    const json = JSON.parse(JSON.stringify(body));
    expect('tourDate' in json).toBe(false);
    expect('durationMinutes' in json).toBe(false);
  });
});
