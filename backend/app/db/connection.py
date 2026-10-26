from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings


@contextmanager
def get_db_connection() -> Iterator[psycopg.Connection[Any]]:
    settings = get_settings()
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        yield conn


@contextmanager
def db_transaction() -> Iterator[psycopg.Connection[Any]]:
    with get_db_connection() as conn:
        with conn.transaction():
            yield conn
