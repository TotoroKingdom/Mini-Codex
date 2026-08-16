"""Migration descriptor and checksum primitives."""

from __future__ import annotations

import hashlib
import sqlite3
from dataclasses import dataclass
from typing import Callable


Upgrade = Callable[[sqlite3.Connection], None]


def normalize_checksum_source(source: str) -> str:
    """Normalize line endings and insignificant trailing whitespace for checksums."""
    if not isinstance(source, str):
        raise TypeError("Migration checksum source must be a string.")

    normalized_lines = source.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip() for line in normalized_lines).strip() + "\n"


@dataclass(frozen=True)
class Migration:
    """One ordered, checksum-protected schema upgrade."""

    version: int
    name: str
    checksum_source: str
    upgrade: Upgrade

    def __post_init__(self) -> None:
        if not isinstance(self.version, int) or isinstance(self.version, bool) or self.version < 1:
            raise ValueError("Migration version must be a positive integer.")
        if not isinstance(self.name, str) or not self.name.strip():
            raise ValueError("Migration name must be a non-empty string.")
        if not normalize_checksum_source(self.checksum_source).strip():
            raise ValueError("Migration checksum source must not be empty.")
        if not callable(self.upgrade):
            raise TypeError("Migration upgrade must be callable.")

    @property
    def checksum(self) -> str:
        """Return the SHA-256 checksum of the normalized source text."""
        return hashlib.sha256(
            normalize_checksum_source(self.checksum_source).encode("utf-8")
        ).hexdigest()
