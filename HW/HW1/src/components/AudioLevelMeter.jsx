import { useEffect, useId, useRef } from 'react';

export function AudioLevelMeter({ readLevel }) {
  const id = useId();
  const meterRef = useRef(null);
  const valueRef = useRef(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = null;
    let lastUpdate = -Infinity;
    let peakSinceUpdate = 0;
    let lastPercent = -1;
    let disposed = false;

    function reset() {
      meterRef.current.value = 0;
      valueRef.current.textContent = '0%';
      lastPercent = 0;
    }

    function draw(now) {
      frameId = null;
      if (disposed || document.hidden) return;
      // Capture short transients every frame, even between slower DOM updates.
      peakSinceUpdate = Math.max(peakSinceUpdate, readLevel());
      // Update DOM at 10 Hz, or 2.5 Hz with reduced motion; never set React state per frame.
      if (now - lastUpdate >= (motion.matches ? 400 : 100)) {
        const percent = Math.round(peakSinceUpdate * 100);
        if (percent !== lastPercent) {
          meterRef.current.value = percent;
          valueRef.current.textContent = `${percent}%`;
          lastPercent = percent;
        }
        lastUpdate = now;
        peakSinceUpdate = 0;
      }
      frameId = requestAnimationFrame(draw);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        peakSinceUpdate = 0;
        reset();
      } else if (frameId === null) {
        lastUpdate = -Infinity;
        frameId = requestAnimationFrame(draw);
      }
    }

    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [readLevel]);

  return (
    <section className="feedback-panel" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Mức tín hiệu âm thanh</h2>
      <label htmlFor={id}>Biên độ số RMS</label>
      <meter ref={meterRef} id={id} min="0" max="100"
        aria-describedby={`${id}-note`} aria-live="off" />
      <span ref={valueRef} className="level-value" aria-hidden="true">0%</span>
      <p id={`${id}-note`} className="level-note">Thang biên độ tín hiệu số 0–100%, không phải dB SPL hay mức âm thanh môi trường. Tắt loa vẫn xem được tín hiệu.</p>
    </section>
  );
}
