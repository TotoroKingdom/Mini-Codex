import { Circle, Mic, Paperclip, Plus, SendHorizontal, ShieldCheck } from 'lucide-react';
import styles from './ComposerShell.module.css';

export function ComposerShell() {
  return (
    <section aria-label="消息编辑器外壳" className={styles.composer}>
      <div className={styles.placeholder}>输入示例内容</div>
      <div className={styles.bottomRow} aria-hidden="true">
        <div className={styles.leftControls}>
          <Plus size={19} strokeWidth={1.8} />
          <Paperclip size={18} strokeWidth={1.7} />
          <span className={styles.access}><ShieldCheck size={17} /> 访问设置</span>
        </div>
        <div className={styles.rightControls}>
          <Circle className={styles.status} size={15} />
          <span>示例模型</span>
          <Mic size={19} />
          <span className={styles.send}><SendHorizontal size={19} /></span>
        </div>
      </div>
    </section>
  );
}
