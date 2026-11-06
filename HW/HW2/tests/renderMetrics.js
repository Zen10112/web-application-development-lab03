export const renderCounts = new Map();
export function recordRender(midi) { renderCounts.set(midi, (renderCounts.get(midi) ?? 0) + 1); }
