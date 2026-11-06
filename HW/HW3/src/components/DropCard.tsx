import { useId } from 'react';
import type { DropPhase, PubgCrateDrop } from '../domain/pubg-vn-arena-contract';
import { formatVnd } from '../domain/formatVnd';
import { usePubgAirdropTimer } from '../hooks/usePubgAirdropTimer';
import { Countdown } from './Countdown';
import type { ClaimState } from '../services/claims/claimContracts';

const phaseContent: Record<DropPhase, { label: string; action: string; description: string }> = {
  WARMUP: { label: 'Warmup', action: 'Claim · Not open yet', description: 'Waiting for the scheduled drop to open.' },
  AIRDROP_LIVE: { label: 'Airdrop live', action: 'Claim drop', description: 'Open for simulated claims. No real ticket or currency is issued.' },
  LOOTED_OUT: { label: 'Looted out', action: 'Claim · Sold out', description: 'All available stock has been claimed.' },
  EXPIRED: { label: 'Expired', action: 'Claim · Drop ended', description: 'The claim window has closed.' },
};
const openingFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

interface DropCardProps {
  readonly drop: PubgCrateDrop;
  readonly previewPhase?: DropPhase;
  readonly serverOffsetMs?: number;
  readonly onClaim?: (id: string) => void;
  readonly claimState?: ClaimState;
}

export function DropCard({ drop, previewPhase, serverOffsetMs = 0, onClaim, claimState }: DropCardProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { remainingMs, isLive } = usePubgAirdropTimer(drop.dropEpochMs, serverOffsetMs);
  const phase = previewPhase === 'AIRDROP_LIVE' && drop.remainingStock === 0 && !claimState?.isPending
    ? 'LOOTED_OUT' : previewPhase ?? (isLive ? (drop.remainingStock > 0 ? 'AIRDROP_LIVE' : 'LOOTED_OUT') : 'WARMUP');
  const content = phaseContent[phase];
  const isPending = claimState?.isPending ?? false;
  const canClaim = !isPending && phase === 'AIRDROP_LIVE' && drop.remainingStock > 0 && Boolean(onClaim);
  return (
    <article className="drop-card" aria-labelledby={titleId} data-phase={phase}>
      <header className="drop-card-top"><span>ARENA EXCLUSIVE</span><span className="phase-badge">{content.label}</span></header>
      <figure className="drop-art" aria-hidden="true">
        <span className="art-crosshair" />
        <span className="supply-case"><span>PVS</span><small>PREMIUM DROP</small></span>
        <figcaption>VIETNAM SERIES / SUPPLY COLLECTION</figcaption>
      </figure>
      <p className="eyebrow">PVS GRAND FINALS / MOCK DROP</p>
      <h3 id={titleId}>{drop.title}</h3>
      <p className="drop-price">{formatVnd(drop.priceVnd)}<span>VND · Mock price</span></p>
      <dl className="drop-details">
        <div><dt>Remaining stock</dt><dd>{drop.remainingStock}<span> available</span></dd></div>
        <div><dt>Drop opens · UTC+7</dt><dd><time dateTime={new Date(drop.dropEpochMs).toISOString()}>{openingFormatter.format(drop.dropEpochMs)}</time></dd></div>
      </dl>
      <Countdown remainingMs={remainingMs} />
      {previewPhase && <p className="preview-override">Mock server scenario: {content.label}. Countdown shows the fixed mock schedule.</p>}
      <p className="phase-description" id={descriptionId}>{content.description}</p>
      <button className="claim-button" type="button" disabled={!canClaim} aria-describedby={descriptionId}
        aria-label={`${isPending ? 'Claiming' : content.action}: ${drop.title}`} aria-busy={isPending} onClick={() => onClaim?.(drop.id)}>
        {isPending ? 'Claiming…' : content.action}<span aria-hidden="true">↗</span>
      </button>
      <p className={`claim-result${claimState?.isError ? ' claim-result--error' : ''}`} role="status">{claimState?.message ?? ''}</p>
    </article>
  );
}
