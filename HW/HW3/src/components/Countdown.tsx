import { formatCountdown } from '../timers/airdropTimer';

export function Countdown({ remainingMs }: { readonly remainingMs: number }) {
  return (
    <p className="countdown">
      <span>{remainingMs === 0 ? 'Scheduled opening reached' : 'Scheduled opening in'}</span>
      <output aria-live="off" aria-label="Time until scheduled drop opening">{formatCountdown(remainingMs)}</output>
    </p>
  );
}
