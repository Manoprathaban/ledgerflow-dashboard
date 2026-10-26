"""Repository for account persistence and lookup operations.

This module is intentionally minimal as a foundation. The full query logic will be
implemented in the next phase when the schema and contract are finalized.
"""

from __future__ import annotations

from app.db.connection import get_db_connection


class AccountRepository:
    def list_accounts(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM accounts ORDER BY created_at DESC LIMIT 0")
            return cursor.fetchall()
