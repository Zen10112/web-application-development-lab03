import type { DropPhase, PubgCrateDrop } from '../../domain/pubg-vn-arena-contract';
import { MOCK_CRATE_DROPS } from '../../data/mockArenaData.ts';
import type { ClaimRequest, ClaimResponse, InventorySnapshot } from './claimContracts';

export function abortableDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new DOMException('Request cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delayMs);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

interface MockOptions {
  readonly now?: () => number;
  readonly latencyMs?: number;
  readonly wait?: (delayMs: number, signal: AbortSignal) => Promise<void>;
}

/** One authority shared by simulated clients in this JS session, independent of React. */
export function createMockClaimApi(drops: readonly PubgCrateDrop[], options: MockOptions = {}) {
  const inventory = new Map(drops.map((drop) => [drop.id, { drop, stock: drop.remainingStock, revision: 0 }]));
  const completed = new Map<string, ClaimResponse>();
  const inFlight = new Map<string, { id: string; promise: Promise<ClaimResponse> }>();
  let phaseOverride: DropPhase | undefined;
  const now = options.now ?? (() => Date.now());
  const wait = options.wait ?? abortableDelay;

  function read(id: string): InventorySnapshot {
    const item = inventory.get(id);
    if (!item) throw new RangeError('Unknown mock drop.');
    const stock = phaseOverride === 'LOOTED_OUT' ? 0 : item.stock;
    const phase = phaseOverride ?? (now() < item.drop.dropEpochMs ? 'WARMUP' : 'AIRDROP_LIVE');
    return Object.freeze({ id, remainingStock: stock, revision: item.revision,
      phase: phase === 'AIRDROP_LIVE' && stock === 0 ? 'LOOTED_OUT' : phase });
  }

  function claim(request: ClaimRequest, signal: AbortSignal): Promise<ClaimResponse> {
    const previous = completed.get(request.claimId);
    if (previous) {
      if (previous.inventory.id !== request.id) return Promise.reject(new Error('Claim ID belongs to another drop.'));
      return Promise.resolve(previous);
    }
    const pending = inFlight.get(request.claimId);
    if (pending) return pending.id === request.id ? pending.promise : Promise.reject(new Error('Claim ID belongs to another drop.'));
    const promise = (async (): Promise<ClaimResponse> => {
      await wait(options.latencyMs ?? 700, signal);
      signal.throwIfAborted();
      const snapshot = read(request.id);
      if (snapshot.phase === 'LOOTED_OUT' || snapshot.remainingStock === 0 || snapshot.revision !== request.expectedRevision) {
        return Object.freeze({ status: 409, claimId: request.claimId, inventory: snapshot });
      }
      if (snapshot.phase !== 'AIRDROP_LIVE') return Object.freeze({ status: 403, claimId: request.claimId, inventory: snapshot });
      // Atomic check-and-decrement: no await between admission and stock mutation.
      const item = inventory.get(request.id)!;
      item.stock -= 1;
      item.revision += 1;
      const response = Object.freeze({ status: 200 as const, claimId: request.claimId, inventory: read(request.id) });
      completed.set(request.claimId, response);
      return response;
    })().finally(() => { inFlight.delete(request.claimId); });
    inFlight.set(request.claimId, { id: request.id, promise });
    return promise;
  }

  function setPhaseOverride(phase?: DropPhase) {
    if (phaseOverride === phase) return;
    phaseOverride = phase;
    for (const item of inventory.values()) item.revision += 1;
  }

  return { read, claim, setPhaseOverride, getPhaseOverride: () => phaseOverride };
}

export const mockClaimApi = createMockClaimApi(MOCK_CRATE_DROPS);
