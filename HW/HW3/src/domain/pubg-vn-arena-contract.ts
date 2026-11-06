/** Lab 3 domain contracts. Monetary values are whole Vietnamese dong. */
export const DROP_PHASES = Object.freeze([
  'WARMUP', 'AIRDROP_LIVE', 'LOOTED_OUT', 'EXPIRED',
] as const);

export type DropPhase = (typeof DROP_PHASES)[number];

export interface PubgCrateDrop {
  readonly id: string;
  readonly title: string;
  readonly priceVnd: number;
  readonly remainingStock: number;
  /** Unix epoch in milliseconds; independent of the user's time zone. */
  readonly dropEpochMs: number;
}

export interface PubgVnSquadStanding {
  readonly squadId: string;
  readonly squadName: string;
  readonly wwcdCount: number;
  readonly placementPts: number;
  readonly killPts: number;
}
