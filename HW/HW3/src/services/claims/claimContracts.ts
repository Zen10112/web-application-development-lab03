import type { DropPhase } from '../../domain/pubg-vn-arena-contract';

export interface InventorySnapshot {
  readonly id: string;
  readonly remainingStock: number;
  readonly revision: number;
  readonly phase: DropPhase;
}

export interface ClaimRequest {
  readonly id: string;
  readonly claimId: string;
  readonly expectedRevision: number;
}

export interface ClaimResponse {
  readonly status: 200 | 403 | 409;
  readonly claimId: string;
  readonly inventory: InventorySnapshot;
}

export interface ClaimApi {
  read: (id: string) => InventorySnapshot;
  claim: (request: ClaimRequest, signal: AbortSignal) => Promise<ClaimResponse>;
}

export interface ClaimState {
  readonly inventory: InventorySnapshot;
  readonly displayedStock: number;
  readonly isPending: boolean;
  readonly message: string;
  readonly isError: boolean;
}
