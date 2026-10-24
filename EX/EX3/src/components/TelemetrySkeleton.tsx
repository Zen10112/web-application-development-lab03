import styles from './PubgMatchTelemetry.module.css';

export function TelemetrySkeleton() {
  return (
    <section
      className={`${styles.panel} ${styles.skeleton}`}
      aria-label="Đang tải telemetry"
      aria-busy="true"
    >
      <p role="status">Đang đồng bộ Blue-Zone...</p>
      <span className={styles.placeholders} aria-hidden="true">
        <span className={styles.placeholder} />
        <span className={styles.placeholder} />
        <span className={styles.placeholder} />
        <span className={styles.placeholder} />
        <span className={styles.placeholder} />
        <span className={styles.placeholder} />
      </span>
    </section>
  );
}
