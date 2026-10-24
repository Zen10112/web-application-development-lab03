import { PUBG_VN_SQUADS } from '../data/pubgSquads';
import type { PubgSquad, SquadId } from '../types/pubg';

export async function fetchPubgTelemetry(
  squadId: SquadId,
  { signal }: { readonly signal: AbortSignal },
): Promise<PubgSquad> {
  signal.throwIfAborted();
  const squad = PUBG_VN_SQUADS.find((item) => item.id === squadId);
  if (!squad) {
    throw new Error('Không tìm thấy đội tuyển.');
  }

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, 1200);

    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });

  signal.throwIfAborted();

  if (Math.random() < 0.35) {
    throw new Error('Mất gói tin: không thể kết nối telemetry.');
  }

  return { ...squad };
}
