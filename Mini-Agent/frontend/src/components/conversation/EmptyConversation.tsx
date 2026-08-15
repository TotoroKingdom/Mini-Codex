import styles from './EmptyConversation.module.css';

export function EmptyConversation() {
  return (
    <section aria-label="空会话" className={styles.emptyConversation} role="region">
      <h1>空会话</h1>
      <p>当前没有可显示的会话。</p>
    </section>
  );
}
