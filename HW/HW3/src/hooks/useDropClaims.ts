import { useCallback, useEffect, useRef, useState } from 'react';
import { MOCK_CRATE_DROPS } from '../data/mockArenaData';
import type { DropPhase } from '../domain/pubg-vn-arena-contract';
import type { ClaimState } from '../services/claims/claimContracts';
import { createClaimClient } from '../services/claims/claimClient';
import { mockClaimApi } from '../services/claims/mockClaimApi';

const ids = MOCK_CRATE_DROPS.map((drop) => drop.id);
export function useDropClaims() {
  const clientRef = useRef<ReturnType<typeof createClaimClient> | null>(null);
  const [states, setStates] = useState<Readonly<Record<string, ClaimState>>>(() => Object.fromEntries(ids.map((id) => {
    const inventory = mockClaimApi.read(id);
    return [id, { inventory, displayedStock: inventory.remainingStock, isPending: false, message: '', isError: false }];
  })));
  useEffect(() => {
    const client = createClaimClient(mockClaimApi, ids, () => {
      if (clientRef.current === client) setStates(Object.fromEntries(ids.map((id) => [id, client.getState(id)])));
    });
    clientRef.current = client;
    client.refresh();
    return () => { clientRef.current = null; client.dispose(); };
  }, []);
  const claim = useCallback((id: string) => { void clientRef.current?.claim(id); }, []);
  const setScenario = useCallback((phase?: DropPhase) => {
    mockClaimApi.setPhaseOverride(phase);
    clientRef.current?.refresh();
  }, []);
  return { states, claim, setScenario, scenario: mockClaimApi.getPhaseOverride(),
    isPending: Object.values(states).some((state) => state.isPending) };
}
