"""Short-lived SQLite connections, transactions, and health probing."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


DATABASE_FILENAME = "mini-agent.db"
DEFAULT_BUSY_TIMEOUT_MS = 5_000


class DatabaseProbeError(RuntimeError):
    """A safe error boundary for SQLite health probe failures."""


class Database:
    """Own the SQLite connection policy for one resolved data directory.

    Construction has no filesystem side effects. The P02 lifespan is responsible
    for creating ``data_dir`` before this boundary is used at runtime.
    """

    def __init__(self, data_dir: Path, *, busy_timeout_ms: int = DEFAULT_BUSY_TIMEOUT_MS) -> None:
        if busy_timeout_ms <= 0:
            raise ValueError("SQLite busy timeout must be greater than zero.")

        self._data_dir = Path(data_dir)
        self._busy_timeout_ms = busy_timeout_ms

    @property
    def database_path(self) -> Path:
        """Return the fixed database location without creating it."""
        return self._data_dir / DATABASE_FILENAME

    @contextmanager
    def read_connection(self) -> Iterator[sqlite3.Connection]:
        """Yield a configured read connection and always close it."""
        connection = self._connect()
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        """Yield one immediate transaction that commits or rolls back atomically."""
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            try:
                yield connection
            except BaseException:
                if connection.in_transaction:
                    connection.rollback()
                raise
            else:
                connection.commit()
        finally:
            connection.close()

    def probe(self) -> int:
        """Return the highest applied schema version using an independent connection."""
        try:
            with self.read_connection() as connection:
                row = connection.execute(
                    "SELECT MAX(version) AS schema_version FROM schema_versions"
                ).fetchone()
        except sqlite3.Error as error:
            raise DatabaseProbeError("Database health probe failed.") from error

        if row is None or row["schema_version"] is None:
            raise DatabaseProbeError("Database health probe found no schema version.")

        return int(row["schema_version"])

    def _connect(self) -> sqlite3.Connection:
        """Create a new connection with the shared SQLite policy."""
        connection = sqlite3.connect(
            self.database_path,
            isolation_level=None,
            timeout=self._busy_timeout_ms / 1_000,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(f"PRAGMA busy_timeout = {self._busy_timeout_ms}")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection
