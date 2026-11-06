import type { DropPhase, PubgCrateDrop } from '../domain/pubg-vn-arena-contract';
import { DropCard } from './DropCard';

interface DropListProps {
  readonly drops: readonly PubgCrateDrop[];
  readonly previewPhase?: DropPhase;
  readonly serverOffsetMs?: number;
  readonly onClaim?: (id: string) => void;
}

export function DropList({ drops, previewPhase, serverOffsetMs, onClaim }: DropListProps) {
  return <ul className="drop-list">{drops.map((drop) => (
    <li key={drop.id}><DropCard drop={drop} previewPhase={previewPhase} serverOffsetMs={serverOffsetMs} onClaim={onClaim} /></li>
  ))}</ul>;
}
