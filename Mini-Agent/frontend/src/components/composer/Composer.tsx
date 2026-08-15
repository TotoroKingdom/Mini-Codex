import { ChevronDown, Circle, Mic, Paperclip, Plus, SendHorizontal, ShieldCheck, Square } from 'lucide-react';
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ComposerMode, UiIntentHandler } from '../../presentation';
import styles from './Composer.module.css';

export type ComposerProps = {
  mode: ComposerMode;
  onIntent: UiIntentHandler;
  placeholder?: string;
  resetKey?: number;
};

const disabledMessages = {
  disabled_running: '当前运行正在进行，暂时无法发送新消息。',
  disabled_waiting_approval: '当前操作正在等待批准，暂时无法发送新消息。',
} as const;

export function Composer({ mode, onIntent, placeholder = '输入示例内容', resetKey }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const isEnabled = mode === 'enabled';
  const trimmedDraft = draft.trim();
  const disabledMessage = isEnabled ? undefined : disabledMessages[mode];

  useEffect(() => {
    setDraft('');
  }, [resetKey]);

  function submit() {
    if (!isEnabled || !trimmedDraft) return;

    onIntent({ type: 'composer.submit', content: trimmedDraft });
    setDraft('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form aria-label="消息编辑器" className={styles.composer} data-mode={mode} onSubmit={handleSubmit}>
      <label className={styles.visuallyHidden} htmlFor="composer-input">输入消息</label>
      <textarea
        aria-describedby={disabledMessage ? 'composer-disabled-message' : undefined}
        className={styles.input}
        disabled={!isEnabled}
        id="composer-input"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        value={draft}
      />
      {disabledMessage && <p className={styles.disabledMessage} id="composer-disabled-message">{disabledMessage}</p>}
      <div className={styles.controls}>
        <div className={styles.leftControls}>
          <button aria-label="添加附件" className={styles.iconButton} disabled={!isEnabled} type="button">
            <Plus aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
          <button aria-label="选择附件" className={styles.iconButton} disabled={!isEnabled} type="button">
            <Paperclip aria-hidden="true" size={18} strokeWidth={1.7} />
          </button>
          <button aria-label="访问设置" className={styles.accessButton} disabled={!isEnabled} type="button">
            <ShieldCheck aria-hidden="true" size={17} />
            <span>访问设置</span>
          </button>
        </div>
        <div className={styles.rightControls}>
          <span className={styles.readyStatus} aria-label={isEnabled ? '状态：就绪' : '状态：已禁用'}>
            <Circle aria-hidden="true" size={14} />
            <span>{isEnabled ? '就绪' : '已禁用'}</span>
          </span>
          <button aria-label="模型选择：示例模型" className={styles.modelButton} disabled={!isEnabled} type="button">
            <span>示例模型</span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
          <button aria-label="语音输入" className={styles.iconButton} disabled={!isEnabled} type="button">
            <Mic aria-hidden="true" size={19} strokeWidth={1.7} />
          </button>
          {isEnabled ? (
            <button aria-label="发送消息" className={styles.sendButton} disabled={!trimmedDraft} type="submit">
              <SendHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
          ) : (
            <button aria-label="停止运行" className={styles.stopButton} onClick={() => onIntent({ type: 'run.stop' })} type="button">
              <Square aria-hidden="true" fill="currentColor" size={14} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
