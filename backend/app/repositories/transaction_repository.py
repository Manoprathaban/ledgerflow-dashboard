"""Repository for transaction persistence and history queries.

This is scaffold code only; detailed SQL and business workflows are pending.
"""

from __future__ import annotations

from app.db.connection import get_db_connection


class TransactionRepository:
    def list_transactions(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 0")
            return cursor.fetchall()
