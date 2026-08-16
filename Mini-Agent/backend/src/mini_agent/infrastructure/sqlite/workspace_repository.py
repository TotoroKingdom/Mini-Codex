"""基于既有 SQLite Database 边界的 Workspace Repository 适配器。"""

from __future__ import annotations

import sqlite3

from mini_agent.domain.workspaces.errors import (
    WorkspaceAlreadyExistsError,
    WorkspacePersistenceError,
)
from mini_agent.domain.workspaces.model import Workspace
from mini_agent.infrastructure.sqlite.database import Database


_WORKSPACE_COLUMNS = """
id, name, root_path, root_path_key, created_at, updated_at, last_opened_at
"""


class SQLiteWorkspaceRepository:
    """使用短连接和事务持久化完整 Workspace 实体。"""

    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, workspace: Workspace) -> None:
        """在单个事务中写入 Workspace 的所有持久化字段。"""
        try:
            with self._database.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO workspaces (
                        id, name, root_path, root_path_key, created_at, updated_at, last_opened_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        workspace.id,
                        workspace.name,
                        workspace.root_path,
                        workspace.root_path_key,
                        workspace.created_at,
                        workspace.updated_at,
                        workspace.last_opened_at,
                    ),
                )
        except sqlite3.IntegrityError:
            existing = self.get_by_root_path_key(workspace.root_path_key)
            if existing is not None:
                raise WorkspaceAlreadyExistsError(workspace_id=existing.id) from None
            raise WorkspacePersistenceError() from None
        except sqlite3.Error:
            raise WorkspacePersistenceError() from None

    def list_all(self) -> list[Workspace]:
        """读取全部 Workspace，并使用持久化契约规定的稳定排序。"""
        try:
            with self._database.read_connection() as connection:
                rows = connection.execute(
                    f"""
                    SELECT {_WORKSPACE_COLUMNS}
                    FROM workspaces
                    ORDER BY last_opened_at DESC, created_at DESC, id ASC
                    """
                ).fetchall()
                return [self._row_to_workspace(row) for row in rows]
        except sqlite3.Error:
            raise WorkspacePersistenceError() from None

    def get_by_id(self, workspace_id: str) -> Workspace | None:
        """按 Workspace ID 获取完整实体。"""
        return self._get_one("id = ?", workspace_id)

    def get_by_root_path_key(self, root_path_key: str) -> Workspace | None:
        """按内部路径比较键获取完整实体。"""
        return self._get_one("root_path_key = ?", root_path_key)

    def rename(self, workspace_id: str, name: str, updated_at: str) -> bool:
        """仅更新显示名称及其更新时间，并返回是否更新到记录。"""
        try:
            with self._database.transaction() as connection:
                result = connection.execute(
                    """
                    UPDATE workspaces
                    SET name = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (name, updated_at, workspace_id),
                )
                return result.rowcount == 1
        except sqlite3.Error:
            raise WorkspacePersistenceError() from None

    def touch_opened(self, workspace_id: str, opened_at: str) -> bool:
        """以同一时间更新最近打开时间和更新时间。"""
        try:
            with self._database.transaction() as connection:
                result = connection.execute(
                    """
                    UPDATE workspaces
                    SET last_opened_at = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (opened_at, opened_at, workspace_id),
                )
                return result.rowcount == 1
        except sqlite3.Error:
            raise WorkspacePersistenceError() from None

    def _get_one(self, predicate: str, value: str) -> Workspace | None:
        """执行精确查找，并在存在时完整映射单行。"""
        try:
            with self._database.read_connection() as connection:
                row = connection.execute(
                    f"""
                    SELECT {_WORKSPACE_COLUMNS}
                    FROM workspaces
                    WHERE {predicate}
                    """,
                    (value,),
                ).fetchone()
        except sqlite3.Error:
            raise WorkspacePersistenceError() from None

        return None if row is None else self._row_to_workspace(row)

    @staticmethod
    def _row_to_workspace(row: sqlite3.Row) -> Workspace:
        """从完整 SQLite Row 构造实体，拒绝缺失或损坏的持久化数据。"""
        try:
            return Workspace(
                id=row["id"],
                name=row["name"],
                root_path=row["root_path"],
                root_path_key=row["root_path_key"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                last_opened_at=row["last_opened_at"],
            )
        except (IndexError, KeyError, TypeError, ValueError):
            raise WorkspacePersistenceError() from None
