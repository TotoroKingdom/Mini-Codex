import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';

import styles from './RenameWorkspaceDialog.module.css';

export type RenameWorkspaceDialogError = {
  code?: string;
  field?: 'name' | 'root_path';
};

export type RenameWorkspaceDialogProps = {
  currentName: string;
  error?: RenameWorkspaceDialogError | null;
  onCancel: () => void;
  onSubmit: (command: { workspace_id: string; name: string }) => void;
  pending?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  workspaceId: string;
};

const errorMessages: Record<string, string> = {
  workspace_name_invalid: '显示名称不符合要求。',
  workspace_not_found: '找不到该工作区。',
  workspace_persistence_failed: '工作区暂时无法重命名，请稍后重试。',
};

function getSafeErrorMessage(error: RenameWorkspaceDialogError | null | undefined): string | null {
  if (!error) {
    return null;
  }
  return errorMessages[error.code ?? ''] ?? '工作区操作未能完成，请稍后重试。';
}

/** 仅编辑显示名称；根路径永不作为此组件的输入或提交内容。 */
export function RenameWorkspaceDialog({
  currentName,
  error = null,
  onCancel,
  onSubmit,
  pending = false,
  returnFocusRef,
  workspaceId,
}: RenameWorkspaceDialogProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const [name, setName] = useState(currentName);
  const errorMessage = getSafeErrorMessage(error);
  const nameErrorMessage = error?.field === 'name' ? errorMessage : null;

  useEffect(() => {
    setName(currentName);
    submittedRef.current = false;
    nameInputRef.current?.focus();
  }, [currentName, workspaceId]);

  useEffect(() => {
    if (!pending) {
      submittedRef.current = false;
    }
  }, [error, pending]);

  function close(): void {
    onCancel();
    returnFocusRef?.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (pending || submittedRef.current) {
      return;
    }
    submittedRef.current = true;
    onSubmit({ workspace_id: workspaceId, name });
  }

  return (
    <div aria-label="重命名工作区" aria-modal="true" className={styles.backdrop} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }} role="dialog">
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <h2>重命名工作区</h2>
        <div className={styles.field}>
          <label htmlFor="workspace-rename-name">显示名称</label>
          <input
            aria-describedby={nameErrorMessage ? 'workspace-rename-name-error' : undefined}
            aria-invalid={nameErrorMessage ? true : undefined}
            autoComplete="off"
            className={styles.input}
            disabled={pending}
            id="workspace-rename-name"
            onChange={(event) => {
              submittedRef.current = false;
              setName(event.target.value);
            }}
            ref={nameInputRef}
            value={name}
          />
          {nameErrorMessage && <p className={styles.error} id="workspace-rename-name-error" role="alert">{nameErrorMessage}</p>}
        </div>
        {errorMessage && !nameErrorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={close} type="button">取消</button>
          <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? '正在保存…' : '保存名称'}</button>
        </div>
      </form>
    </div>
  );
}
