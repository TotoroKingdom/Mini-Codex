import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';

import styles from './AddWorkspaceForm.module.css';

export type WorkspaceFormError = {
  code?: string;
  field?: 'name' | 'root_path';
};

export type AddWorkspaceFormProps = {
  error?: WorkspaceFormError | null;
  onCancel: () => void;
  onSubmit: (command: { root_path: string; name?: string }) => void;
  pending?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const domainErrorMessages: Record<string, string> = {
  workspace_already_exists: '该目录已经添加为工作区。',
  workspace_name_invalid: '显示名称不符合要求。',
  workspace_path_invalid: '请输入支持格式的绝对路径。',
  workspace_path_missing: '该路径不存在。',
  workspace_path_not_directory: '该路径不是目录。',
  workspace_path_inaccessible: '无法访问该路径。',
  workspace_persistence_failed: '工作区暂时无法保存，请稍后重试。',
  workspace_not_found: '找不到该工作区。',
};

function getSafeErrorMessage(error: WorkspaceFormError | null | undefined): string | null {
  if (!error) {
    return null;
  }
  return domainErrorMessages[error.code ?? ''] ?? '工作区操作未能完成，请稍后重试。';
}

/** 只通过 Props 回调上报创建意图，不访问 API 或浏览器目录能力。 */
export function AddWorkspaceForm({
  error = null,
  onCancel,
  onSubmit,
  pending = false,
  returnFocusRef,
}: AddWorkspaceFormProps) {
  const pathInputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const [rootPath, setRootPath] = useState('');
  const [name, setName] = useState('');
  const [pathValidationMessage, setPathValidationMessage] = useState<string | null>(null);
  const externalErrorMessage = getSafeErrorMessage(error);
  const pathErrorMessage = pathValidationMessage ?? (error?.field === 'root_path' ? externalErrorMessage : null);
  const nameErrorMessage = error?.field === 'name' ? externalErrorMessage : null;

  useEffect(() => {
    pathInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!pending) {
      submittedRef.current = false;
    }
  }, [error, pending]);

  function resetSubmissionGuard(): void {
    submittedRef.current = false;
  }

  function close(): void {
    onCancel();
    returnFocusRef?.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (pending || submittedRef.current) {
      return;
    }
    if (!rootPath.trim()) {
      setPathValidationMessage('请输入绝对工作区路径。');
      return;
    }

    submittedRef.current = true;
    setPathValidationMessage(null);
    onSubmit({
      root_path: rootPath,
      ...(name === '' ? {} : { name }),
    });
  }

  return (
    <form aria-label="添加工作区" className={styles.form} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2>添加工作区</h2>
        <p>输入或粘贴路径以添加本机上的项目目录。</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="workspace-root-path">绝对工作区路径</label>
        <input
          aria-describedby={pathErrorMessage ? 'workspace-root-path-help workspace-root-path-error' : 'workspace-root-path-help'}
          aria-invalid={pathErrorMessage ? true : undefined}
          autoComplete="off"
          className={styles.input}
          disabled={pending}
          id="workspace-root-path"
          onChange={(event) => {
            resetSubmissionGuard();
            setRootPath(event.target.value);
            setPathValidationMessage(null);
          }}
          placeholder="例如 C:\work\mini-agent"
          ref={pathInputRef}
          value={rootPath}
        />
        <p className={styles.help} id="workspace-root-path-help">支持盘符绝对目录，例如 C:\work\mini-agent。</p>
        {pathErrorMessage && <p className={styles.error} id="workspace-root-path-error" role="alert">{pathErrorMessage}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="workspace-display-name">显示名称（可选）</label>
        <input
          aria-describedby={nameErrorMessage ? 'workspace-display-name-error' : undefined}
          aria-invalid={nameErrorMessage ? true : undefined}
          autoComplete="off"
          className={styles.input}
          disabled={pending}
          id="workspace-display-name"
          onChange={(event) => {
            resetSubmissionGuard();
            setName(event.target.value);
          }}
          value={name}
        />
        {nameErrorMessage && <p className={styles.error} id="workspace-display-name-error" role="alert">{nameErrorMessage}</p>}
      </div>
      {externalErrorMessage && !pathErrorMessage && !nameErrorMessage && <p className={styles.error} role="alert">{externalErrorMessage}</p>}
      <div className={styles.actions}>
        <button className={styles.secondaryButton} onClick={close} type="button">取消</button>
        <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? '正在添加…' : '添加工作区'}</button>
      </div>
    </form>
  );
}
