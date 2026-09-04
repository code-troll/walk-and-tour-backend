import {
  ALLOWED_HOTEL_BOOKING_TRANSITIONS,
  canTransition,
  HOTEL_BOOKING_ACTOR_TYPES,
  HOTEL_BOOKING_STATUSES,
  HotelBookingActorType,
  HotelBookingStatus,
} from '../shared/domain';

/**
 * The transition table is the whole rule for who may move a booking where, so
 * it is asserted exhaustively rather than by example: every status pair, for
 * every actor, is either explicitly allowed below or must be refused.
 */
const ALLOWED: ReadonlyArray<[HotelBookingStatus, HotelBookingStatus, HotelBookingActorType]> = [
  ['pending', 'confirmed', 'admin'],
  ['pending', 'cancelled', 'hotel'],
  ['pending', 'cancelled', 'admin'],
  ['confirmed', 'completed', 'admin'],
  ['confirmed', 'cancelled', 'hotel'],
  ['confirmed', 'cancelled', 'admin'],
  ['completed', 'invoiced', 'admin'],
  ['completed', 'cancelled', 'admin'],
];

const isAllowed = (
  from: HotelBookingStatus,
  to: HotelBookingStatus,
  actorType: HotelBookingActorType,
) => ALLOWED.some(([f, t, a]) => f === from && t === to && a === actorType);

describe('hotel booking transitions', () => {
  it('covers every status pair for every actor', () => {
    const cases: string[] = [];

    for (const from of HOTEL_BOOKING_STATUSES) {
      for (const to of HOTEL_BOOKING_STATUSES) {
        for (const actorType of HOTEL_BOOKING_ACTOR_TYPES) {
          cases.push(`${from}->${to} by ${actorType}`);
          expect({
            case: `${from}->${to} by ${actorType}`,
            allowed: canTransition({ from, to, actorType }),
          }).toEqual({
            case: `${from}->${to} by ${actorType}`,
            allowed: isAllowed(from, to, actorType),
          });
        }
      }
    }

    // 5 statuses squared, times 2 actors.
    expect(cases).toHaveLength(50);
  });

  it('lets a hotel cancel but never confirm, complete or invoice', () => {
    expect(canTransition({ from: 'pending', to: 'cancelled', actorType: 'hotel' })).toBe(true);
    expect(canTransition({ from: 'pending', to: 'confirmed', actorType: 'hotel' })).toBe(false);
    expect(canTransition({ from: 'confirmed', to: 'completed', actorType: 'hotel' })).toBe(false);
    expect(canTransition({ from: 'completed', to: 'invoiced', actorType: 'hotel' })).toBe(false);
  });

  it('does not let a hotel cancel a booking that has already happened', () => {
    expect(canTransition({ from: 'completed', to: 'cancelled', actorType: 'hotel' })).toBe(false);
  });

  it('treats cancelled and invoiced as terminal for everyone', () => {
    for (const terminal of ['cancelled', 'invoiced'] as const) {
      expect(ALLOWED_HOTEL_BOOKING_TRANSITIONS[terminal]).toEqual({});

      for (const to of HOTEL_BOOKING_STATUSES) {
        for (const actorType of HOTEL_BOOKING_ACTOR_TYPES) {
          expect(canTransition({ from: terminal, to, actorType })).toBe(false);
        }
      }
    }
  });

  it('never allows a status to transition to itself', () => {
    for (const status of HOTEL_BOOKING_STATUSES) {
      for (const actorType of HOTEL_BOOKING_ACTOR_TYPES) {
        expect(canTransition({ from: status, to: status, actorType })).toBe(false);
      }
    }
  });

  it('never allows a booking to move backwards', () => {
    expect(canTransition({ from: 'confirmed', to: 'pending', actorType: 'admin' })).toBe(false);
    expect(canTransition({ from: 'completed', to: 'confirmed', actorType: 'admin' })).toBe(false);
  });

  it('never lets a booking skip confirmation or completion', () => {
    expect(canTransition({ from: 'pending', to: 'completed', actorType: 'admin' })).toBe(false);
    expect(canTransition({ from: 'pending', to: 'invoiced', actorType: 'admin' })).toBe(false);
    expect(canTransition({ from: 'confirmed', to: 'invoiced', actorType: 'admin' })).toBe(false);
  });
});
