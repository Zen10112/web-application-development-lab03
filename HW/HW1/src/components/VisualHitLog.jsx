import { useId } from 'react';

export function VisualHitLog({ hits, announcement }) {
  const headingId = useId();
  return (
    <section className="feedback-panel" aria-labelledby={headingId}>
      <header className="feedback-heading">
        <h2 id={headingId}>Lịch sử đánh trống</h2>
        <span>12 lượt gần nhất</span>
      </header>
      {hits.length > 0 && (
        <ol className="hit-log" aria-label="Lượt mới nhất trước" aria-live="off">
          {hits.map((hit) => (
            <li key={hit.sequence}>
              <span className="hit-order">#{hit.sequence}</span>
              <span>{hit.label}</span><kbd>{hit.key}</kbd>
            </li>
          ))}
        </ol>
      )}
      <output className="hit-summary" aria-live="polite" aria-atomic="true">{announcement}</output>
    </section>
  );
}
