from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection

from app.db.connection import get_db_connection


@contextmanager
def transaction_manager() -> Iterator[Connection]:
    with get_db_connection() as conn:
        with conn.transaction():
            yield conn
