import type { DropPhase, PubgCrateDrop } from '../domain/pubg-vn-arena-contract';
import { DropCard } from './DropCard';
import type { ClaimState } from '../services/claims/claimContracts';

interface DropListProps {
  readonly drops: readonly PubgCrateDrop[];
  readonly previewPhase?: DropPhase;
  readonly serverOffsetMs?: number;
  readonly onClaim?: (id: string) => void;
  readonly claimStates?: Readonly<Record<string, ClaimState>>;
}

export function DropList({ drops, previewPhase, serverOffsetMs, onClaim, claimStates }: DropListProps) {
  return <ul className="drop-list">{drops.map((drop) => (
    <li key={drop.id}><DropCard drop={drop} previewPhase={previewPhase} serverOffsetMs={serverOffsetMs} onClaim={onClaim} claimState={claimStates?.[drop.id]} /></li>
  ))}</ul>;
}
