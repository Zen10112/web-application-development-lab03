import { useEffect, useState } from 'react';
import { calculateRemainingMs, subscribeAirdropTimer } from '../timers/airdropTimer';

export function usePubgAirdropTimer(targetEpochMs: number, serverOffsetMs = 0) {
  const [snapshot, setSnapshot] = useState(() => ({
    targetEpochMs, serverOffsetMs, remainingMs: calculateRemainingMs(targetEpochMs, serverOffsetMs),
  }));

  useEffect(() => subscribeAirdropTimer(targetEpochMs, serverOffsetMs, (remainingMs) => {
    setSnapshot((previous) => previous.targetEpochMs === targetEpochMs
      && previous.serverOffsetMs === serverOffsetMs && previous.remainingMs === remainingMs
      ? previous : { targetEpochMs, serverOffsetMs, remainingMs });
  }), [targetEpochMs, serverOffsetMs]);

  // Never expose the previous target's isLive state during a prop change.
  const remainingMs = snapshot.targetEpochMs === targetEpochMs && snapshot.serverOffsetMs === serverOffsetMs
    ? snapshot.remainingMs : calculateRemainingMs(targetEpochMs, serverOffsetMs);
  return { remainingMs, isLive: remainingMs === 0 };
}
