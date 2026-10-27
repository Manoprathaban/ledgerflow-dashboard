from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from uuid import UUID

from psycopg import Connection

from app.db.connection import get_db_connection


@contextmanager
def transaction_manager(user_id: UUID) -> Iterator[Connection[Any]]:
    with get_db_connection(user_id) as conn:
        with conn.transaction():
            yield conn
