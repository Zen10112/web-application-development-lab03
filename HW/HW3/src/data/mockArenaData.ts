import type { PubgCrateDrop, PubgVnSquadStanding } from '../domain/pubg-vn-arena-contract';

/** Fictional, fixed fixtures; never an official PVS schedule, price or live standing. */
export const MOCK_SQUAD_STANDINGS: readonly PubgVnSquadStanding[] = Object.freeze([
  Object.freeze({ squadId: 'te', squadName: 'The Expendables', wwcdCount: 3, placementPts: 48, killPts: 64 }),
  Object.freeze({ squadId: 'ces', squadName: 'Cerberus Esports', wwcdCount: 2, placementPts: 44, killPts: 59 }),
  Object.freeze({ squadId: 'roy', squadName: 'Roy Esports', wwcdCount: 1, placementPts: 36, killPts: 52 }),
  Object.freeze({ squadId: 'agg', squadName: 'AGG', wwcdCount: 1, placementPts: 31, killPts: 47 }),
] satisfies PubgVnSquadStanding[]);

export const MOCK_CRATE_DROPS: readonly PubgCrateDrop[] = Object.freeze([
  Object.freeze({
    id: 'mock-pvs-finals-vip',
    title: 'PVS Grand Finals VIP Ticket',
    priceVnd: 1500000,
    remainingStock: 40,
    dropEpochMs: Date.parse('2030-01-01T12:00:00+07:00'),
  }),
  Object.freeze({
    id: 'mock-gcoin-crate',
    title: '5,000 G-Coin Contraband Crate',
    priceVnd: 990000,
    remainingStock: 100,
    dropEpochMs: Date.parse('2030-01-01T12:30:00+07:00'),
  }),
] satisfies PubgCrateDrop[]);

export const MOCK_ARENA_DATA = Object.freeze({
  isMock: true as const,
  disclaimer: 'Mock data for coursework only. Not official PUBG/PVS live data, pricing or scheduling.',
  squads: MOCK_SQUAD_STANDINGS,
  drops: MOCK_CRATE_DROPS,
});
