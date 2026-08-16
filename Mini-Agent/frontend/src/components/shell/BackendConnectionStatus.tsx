import styles from './BackendConnectionStatus.module.css';

export type BackendConnectionStatusValue = 'checking' | 'connected' | 'disconnected';

export type BackendConnectionStatusProps = {
  status: BackendConnectionStatusValue;
  collapsed?: boolean;
  onRetry: () => void;
};

const statusContent: Record<BackendConnectionStatusValue, { message: string; compactMessage: string }> = {
  checking: { message: '正在连接后端', compactMessage: '连接中' },
  connected: { message: '后端已连接', compactMessage: '已连接' },
  disconnected: { message: '后端未连接', compactMessage: '未连接' },
};

/** 只展示后端连接状态，并把重试意图交由上层处理。 */
export function BackendConnectionStatus({
  status,
  collapsed = false,
  onRetry,
}: BackendConnectionStatusProps) {
  const content = statusContent[status];

  return (
    <div
      aria-label={`后端连接状态：${content.message}`}
      className={styles.root}
      data-collapsed={collapsed}
      data-status={status}
    >
      <span className={styles.status} role="status">
        <span aria-hidden="true" className={styles.indicator} />
        <span className={styles.expandedText}>{content.message}</span>
        <span className={styles.compactText}>{content.compactMessage}</span>
      </span>
      {status !== 'checking' && (
        <button aria-label="重试连接后端" className={styles.retryButton} onClick={onRetry} type="button">
          重试
        </button>
      )}
    </div>
  );
}
