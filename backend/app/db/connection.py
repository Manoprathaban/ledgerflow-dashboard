from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings


@contextmanager
def get_db_connection(user_id: UUID) -> Iterator[psycopg.Connection[Any]]:
    settings = get_settings()
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        conn.execute("SET LOCAL ROLE ledger_app")
        conn.execute(
            "SELECT set_config('request.jwt.claim.sub', %s, true)",
            (str(user_id),),
        )
        yield conn


@contextmanager
def db_transaction(user_id: UUID) -> Iterator[psycopg.Connection[Any]]:
    with get_db_connection(user_id) as conn:
        with conn.transaction():
            yield conn
