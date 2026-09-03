/**
 * Derives the sign-in username for a hotel's access user from the hotel name.
 *
 * Danish letters are transliterated before the string is normalized, not after.
 * A plain NFD strip turns `å` into `a` and `ø` into `o`, which would make
 * "Hotel Søborg" and "Hotel Soborg" fight over the same username; the Danish
 * convention keeps them apart.
 */
const DANISH_TRANSLITERATIONS: ReadonlyArray<[RegExp, string]> = [
  [/æ/g, 'ae'],
  [/ø/g, 'oe'],
  [/å/g, 'aa'],
  [/Æ/g, 'AE'],
  [/Ø/g, 'OE'],
  [/Å/g, 'AA'],
];

/**
 * Auth0 database connections cap username length, and the default range is far
 * too short for real hotel names. The connection has to be widened to match
 * this, so the value lives in one place.
 */
export const HOTEL_USERNAME_MAX_LENGTH = 40;
export const HOTEL_USERNAME_MIN_LENGTH = 3;

const FALLBACK_USERNAME_STEM = 'hotel';

export const toHotelUsernameStem = (hotelName: string): string => {
  let value = hotelName;

  for (const [pattern, replacement] of DANISH_TRANSLITERATIONS) {
    value = value.replace(pattern, replacement);
  }

  const stem = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HOTEL_USERNAME_MAX_LENGTH)
    .replace(/-+$/g, '');

  // A name written entirely in characters that do not survive normalization,
  // or one that is too short to be a valid username, still needs a usable stem.
  return stem.length >= HOTEL_USERNAME_MIN_LENGTH ? stem : FALLBACK_USERNAME_STEM;
};

/**
 * Appends the smallest numeric suffix that is not taken yet, keeping the result
 * within the length cap by trimming the stem rather than overflowing it.
 */
export const buildHotelUsernameCandidate = (stem: string, attempt: number): string => {
  if (attempt === 0) {
    return stem;
  }

  const suffix = `-${attempt + 1}`;
  const trimmedStem = stem
    .slice(0, HOTEL_USERNAME_MAX_LENGTH - suffix.length)
    .replace(/-+$/g, '');

  return `${trimmedStem}${suffix}`;
};

/**
 * Resolves a free username for a hotel.
 *
 * `isTaken` is asked for each candidate in turn so the caller can check against
 * whatever it needs to — in practice the unique index on `hotel_users.username`
 * inside the transaction that is about to insert the row.
 */
export const resolveHotelUsername = async ({
  hotelName,
  isTaken,
  maxAttempts = 100,
}: {
  hotelName: string;
  isTaken: (candidate: string) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<string> => {
  const stem = toHotelUsernameStem(hotelName);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = buildHotelUsernameCandidate(stem, attempt);

    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to derive a free username for "${hotelName}" after ${maxAttempts} attempts.`,
  );
};
