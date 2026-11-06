import type { DropPhase, PubgCrateDrop } from '../domain/pubg-vn-arena-contract';
import { DropCard } from './DropCard';

interface DropListProps {
  readonly drops: readonly PubgCrateDrop[];
  readonly phase: DropPhase;
  readonly onClaim?: (id: string) => void;
}

export function DropList({ drops, phase, onClaim }: DropListProps) {
  return <ul className="drop-list">{drops.map((drop) => (
    <li key={drop.id}><DropCard drop={drop} phase={phase} onClaim={onClaim} /></li>
  ))}</ul>;
}
