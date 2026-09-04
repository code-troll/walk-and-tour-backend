/**
 * Decimal arithmetic for money, in minor units.
 *
 * TypeORM hands back `numeric` columns as strings, which is the right call —
 * they must never pass through a float. Nothing else in this codebase sums
 * money yet, so this is the one place that does it, and everything goes through
 * here rather than reaching for `Number()`.
 *
 * Amounts are stored and returned as plain decimal strings with two places.
 * They are **exclusive of VAT**: Walk and Tour bills hotels without it, and
 * nothing here computes or splits out a tax component.
 */
const SCALE = 2;
const SCALE_FACTOR = 100n;

export class InvalidMoneyAmountError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid decimal amount.`);
    this.name = 'InvalidMoneyAmountError';
  }
}

const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Parses a decimal string into minor units, rejecting anything ambiguous. */
export const toMinorUnits = (value: string): bigint => {
  const trimmed = value.trim();

  if (!AMOUNT_PATTERN.test(trimmed)) {
    throw new InvalidMoneyAmountError(value);
  }

  const isNegative = trimmed.startsWith('-');
  const [whole, fraction = ''] = trimmed.replace('-', '').split('.');
  const minor =
    BigInt(whole) * SCALE_FACTOR + BigInt(fraction.padEnd(SCALE, '0'));

  return isNegative ? -minor : minor;
};

export const fromMinorUnits = (minor: bigint): string => {
  const isNegative = minor < 0n;
  const absolute = isNegative ? -minor : minor;
  const whole = absolute / SCALE_FACTOR;
  const fraction = (absolute % SCALE_FACTOR).toString().padStart(SCALE, '0');

  return `${isNegative ? '-' : ''}${whole}.${fraction}`;
};

export const sumAmounts = (amounts: string[]): string =>
  fromMinorUnits(
    amounts.reduce((total, amount) => total + toMinorUnits(amount), 0n),
  );

export const multiplyAmount = (amount: string, factor: number): string => {
  if (!Number.isInteger(factor) || factor < 0) {
    throw new Error(`Cannot multiply an amount by "${factor}".`);
  }

  return fromMinorUnits(toMinorUnits(amount) * BigInt(factor));
};

export const amountsAreEqual = (left: string, right: string): boolean =>
  toMinorUnits(left) === toMinorUnits(right);
