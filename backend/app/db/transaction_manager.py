from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from psycopg import Connection

from app.db.connection import get_db_connection


@contextmanager
def transaction_manager() -> Iterator[Connection[Any]]:
    with get_db_connection() as conn:
        with conn.transaction():
            yield conn
