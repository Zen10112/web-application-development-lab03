export type SquadId = 'ces' | 'te' | 'ge';

export type ViewState<T> =
  | { readonly status: 'IDLE' }
  | { readonly status: 'LOADING' }
  | { readonly status: 'SUCCESS'; readonly data: T }
  | { readonly status: 'ERROR'; readonly error: string };

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
