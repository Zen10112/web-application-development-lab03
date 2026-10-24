export type SquadId = 'ces' | 'te' | 'ge';

export interface PubgSquad {
  readonly id: SquadId;
  readonly name: string;
  readonly map: string;
  readonly phase: string;
  readonly alive: number;
  readonly kills: number;
  readonly wwcdProb: string;
  readonly status: string;
}
