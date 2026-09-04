import {
  amountsAreEqual,
  fromMinorUnits,
  InvalidMoneyAmountError,
  multiplyAmount,
  sumAmounts,
  toMinorUnits,
} from './money';

describe('toMinorUnits', () => {
  it.each([
    ['0', 0n],
    ['1', 100n],
    ['1.5', 150n],
    ['1.05', 105n],
    ['1234.56', 123456n],
    ['-25.50', -2550n],
  ])('parses %p', (input, expected) => {
    expect(toMinorUnits(input)).toBe(expected);
  });

  it.each([['1.234'], ['abc'], [''], ['1,5'], ['1.2.3'], ['1e3']])(
    'rejects %p rather than guessing',
    (input) => {
      expect(() => toMinorUnits(input)).toThrow(InvalidMoneyAmountError);
    },
  );
});

describe('fromMinorUnits', () => {
  it.each([
    [0n, '0.00'],
    [5n, '0.05'],
    [100n, '1.00'],
    [123456n, '1234.56'],
    [-2550n, '-25.50'],
  ])('formats %p as %p', (input, expected) => {
    expect(fromMinorUnits(input)).toBe(expected);
  });
});

describe('sumAmounts', () => {
  it('adds without floating point drift', () => {
    // 0.1 + 0.2 is the classic float failure; it must be exact here.
    expect(sumAmounts(['0.10', '0.20'])).toBe('0.30');
  });

  it('sums a realistic booking', () => {
    expect(sumAmounts(['1200.00', '150.00', '75.50'])).toBe('1425.50');
  });

  it('handles a discount line', () => {
    expect(sumAmounts(['1200.00', '-200.00'])).toBe('1000.00');
  });

  it('returns zero for no lines', () => {
    expect(sumAmounts([])).toBe('0.00');
  });
});

describe('multiplyAmount', () => {
  it('multiplies a per-person price by a participant count', () => {
    expect(multiplyAmount('249.50', 4)).toBe('998.00');
  });

  it('returns zero for no participants', () => {
    expect(multiplyAmount('249.50', 0)).toBe('0.00');
  });

  it.each([[1.5], [-1]])('refuses a factor of %p', (factor) => {
    expect(() => multiplyAmount('10.00', factor)).toThrow();
  });
});

describe('amountsAreEqual', () => {
  it('compares by value, not by spelling', () => {
    expect(amountsAreEqual('1.5', '1.50')).toBe(true);
    expect(amountsAreEqual('1.50', '1.51')).toBe(false);
  });
});
