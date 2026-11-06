export function calculateRemainingMs(targetEpochMs: number, serverOffsetMs = 0, now = Date.now()): number {
  return Math.max(0, targetEpochMs - (now + serverOffsetMs));
}

interface TimerEnvironment {
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => number;
  cancel: (id: number) => void;
  isVisible: () => boolean;
  onVisibilityChange: (callback: () => void) => () => void;
}

const browserEnvironment: TimerEnvironment = {
  now: () => Date.now(),
  schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel: (id) => window.clearTimeout(id),
  isVisible: () => document.visibilityState === 'visible',
  onVisibilityChange(callback) {
    document.addEventListener('visibilitychange', callback);
    return () => document.removeEventListener('visibilitychange', callback);
  },
};

/** Lab 2's absolute-target calculation, with one pending timeout and no hidden-tab polling. */
export function subscribeAirdropTimer(targetEpochMs: number, serverOffsetMs: number,
  onTick: (remainingMs: number) => void, environment = browserEnvironment): () => void {
  let timerId: number | undefined;
  let stopped = false;
  const cancelPending = () => {
    if (timerId !== undefined) environment.cancel(timerId);
    timerId = undefined;
  };
  const sync = () => {
    if (stopped) return;
    cancelPending();
    const remainingMs = calculateRemainingMs(targetEpochMs, serverOffsetMs, environment.now());
    onTick(remainingMs);
    if (!stopped && remainingMs > 0 && environment.isVisible()) {
      // Align with the next visible second boundary, including the final zero.
      timerId = environment.schedule(sync, Math.min(remainingMs, remainingMs % 1000 || 1000));
    }
  };
  const removeVisibilityListener = environment.onVisibilityChange(() => {
    if (environment.isVisible()) sync();
    else cancelPending();
  });
  sync();
  return () => {
    stopped = true;
    cancelPending();
    removeVisibilityListener();
  };
}

export function formatCountdown(remainingMs: number): string {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  const parts = [hours, minutes, seconds % 60].map((value) => String(value).padStart(2, '0'));
  return `${days ? `${days}d ` : ''}${parts.join(':')}`;
}
