import type { ClaimApi, ClaimResponse, ClaimState, InventorySnapshot } from './claimContracts';

/** Per-client optimistic state/locks. The API remains the authoritative stock owner. */
export function createClaimClient(api: ClaimApi, ids: readonly string[], onChange: () => void,
  { timeoutMs = 5000 }: { timeoutMs?: number } = {}) {
  const states = new Map<string, ClaimState>(ids.map((id) => {
    const inventory = api.read(id);
    return [id, { inventory, displayedStock: inventory.remainingStock, isPending: false, message: '', isError: false }];
  }));
  const pending = new Map<string, { claimId: string; controller: AbortController }>();
  let disposed = false;
  const emit = () => { if (!disposed) onChange(); };
  const getState = (id: string) => {
    const state = states.get(id);
    if (!state) throw new RangeError('Unknown client drop.');
    return state;
  };
  const merge = (id: string, snapshot: InventorySnapshot) => {
    const state = getState(id);
    if (snapshot.id === id && snapshot.revision >= state.inventory.revision) {
      states.set(id, { ...state, inventory: snapshot,
        displayedStock: Math.max(0, snapshot.remainingStock - (pending.has(id) ? 1 : 0)) });
    }
  };
  const readLatest = (id: string): boolean => {
    try { merge(id, api.read(id)); return true; }
    catch { return false; }
  };

  function refresh() {
    if (disposed) return;
    for (const id of ids) {
      if (!readLatest(id)) states.set(id, { ...getState(id), isError: true,
        message: 'Inventory unavailable; could not refresh. Showing last confirmed stock.' });
    }
    emit();
  }

  async function claim(id: string): Promise<boolean> {
    if (disposed || pending.has(id)) return false;
    getState(id); // Reject unknown IDs before attempting an inventory refresh.
    if (!readLatest(id)) {
      states.set(id, { ...getState(id), isError: true,
        message: 'Inventory unavailable; could not refresh. No request sent. Retry checks availability.' });
      emit();
      return false;
    }
    const state = getState(id);
    if (state.inventory.phase !== 'AIRDROP_LIVE' || state.displayedStock <= 0) {
      states.set(id, { ...state, message: 'Drop unavailable. Inventory synchronized; no claim issued.', isError: true });
      emit();
      return false;
    }
    const claimId = crypto.randomUUID();
    const controller = new AbortController();
    pending.set(id, { claimId, controller }); // Synchronous lock, before React can render.
    states.set(id, { ...state, displayedStock: Math.max(0, state.inventory.remainingStock - 1),
      isPending: true, message: 'Claiming mock drop…', isError: false });
    emit();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    let removeAbort = () => {};
    try {
      const response = await new Promise<ClaimResponse>((resolve, reject) => {
        const abort = () => reject(new DOMException('Request cancelled', 'AbortError'));
        controller.signal.addEventListener('abort', abort, { once: true });
        removeAbort = () => controller.signal.removeEventListener('abort', abort);
        if (controller.signal.aborted) { abort(); return; }
        api.claim({ id, claimId, expectedRevision: state.inventory.revision }, controller.signal).then(resolve, reject);
      });
      if (disposed || pending.get(id)?.claimId !== claimId) return false;
      if (response.claimId !== claimId || response.inventory.id !== id) throw new Error('Mismatched claim response.');
      pending.delete(id);
      merge(id, response.inventory);
      // Reconcile with the latest mock authority even if response delivery was reordered.
      const synchronized = readLatest(id);
      const current = getState(id);
      states.set(id, { ...current, displayedStock: current.inventory.remainingStock, isPending: false,
        isError: response.status !== 200 || !synchronized,
        message: !synchronized ? `${response.status === 200 ? 'Mock claim confirmed.' : 'Claim was not issued.'} Could not refresh latest inventory. Showing last confirmed stock.`
          : response.status === 200 ? 'Mock claim confirmed. No real ticket or currency issued.'
          : response.status === 409 ? '409 Conflict: stock changed. Inventory synchronized; no claim issued.'
            : 'Drop is not live. Inventory synchronized; no claim issued.' });
      emit();
      return response.status === 200;
    } catch (error) {
      if (disposed || pending.get(id)?.claimId !== claimId) return false;
      pending.delete(id);
      // Never restore an old captured stock count. A failed delivery may follow a server commit.
      const synchronized = readLatest(id);
      const current = getState(id);
      states.set(id, { ...current, displayedStock: current.inventory.remainingStock, isPending: false, isError: true,
        message: !synchronized ? 'Network or request error; could not refresh inventory. Showing last confirmed stock. Retry checks availability.'
          : timedOut ? 'Claim timed out. Inventory synchronized before retry.'
          : error instanceof DOMException && error.name === 'AbortError' ? 'Claim cancelled. Inventory synchronized.'
            : 'Network or response error. Inventory synchronized before retry.' });
      emit();
      return false;
    } finally {
      clearTimeout(timer);
      removeAbort();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const request of pending.values()) request.controller.abort();
    pending.clear();
  }

  return { getState, claim, refresh, cancel: (id: string) => pending.get(id)?.controller.abort(), dispose };
}
