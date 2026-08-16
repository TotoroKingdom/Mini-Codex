import styles from './WorkspaceList.module.css';

export type WorkspaceListItem = {
  id: string;
  name: string;
  root_path: string;
  availability: 'available' | 'missing' | 'not_directory' | 'inaccessible';
};

export type WorkspaceListProps = {
  activeWorkspaceId: string | null;
  items: readonly WorkspaceListItem[];
  onOpen: (workspaceId: string) => void;
  onRecheck: (workspaceId: string) => void;
  onRename: (workspaceId: string) => void;
  pending?: boolean;
};

const availabilityContent: Record<WorkspaceListItem['availability'], { label: string; action: 'open' | 'recheck' }> = {
  available: { label: '可用', action: 'open' },
  missing: { label: '目录缺失', action: 'recheck' },
  not_directory: { label: '不是目录', action: 'recheck' },
  inaccessible: { label: '无法访问', action: 'recheck' },
};

/** 仅展示已排序 View Model，并把所有操作意图回调给上层。 */
export function WorkspaceList({
  activeWorkspaceId,
  items,
  onOpen,
  onRecheck,
  onRename,
  pending = false,
}: WorkspaceListProps) {
  return (
    <ul aria-label="工作区列表" className={styles.list}>
      {items.map((item) => {
        const availability = availabilityContent[item.availability];
        const isCurrent = item.id === activeWorkspaceId;
        return (
          <li
            aria-current={isCurrent ? 'true' : undefined}
            className={styles.item}
            data-availability={item.availability}
            key={item.id}
          >
            <div className={styles.details}>
              <span className={styles.name}>{item.name}</span>
              <span aria-label={`根路径：${item.root_path}`} className={styles.path} title={item.root_path}>{item.root_path}</span>
              <span className={styles.availability} role="status">状态：{availability.label}</span>
            </div>
            <div className={styles.actions}>
              {availability.action === 'open' ? (
                <button disabled={pending} onClick={() => onOpen(item.id)} type="button">打开 {item.name}</button>
              ) : (
                <button disabled={pending} onClick={() => onRecheck(item.id)} type="button">重新检查并打开 {item.name}</button>
              )}
              <button disabled={pending} onClick={() => onRename(item.id)} type="button">重命名 {item.name}</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
