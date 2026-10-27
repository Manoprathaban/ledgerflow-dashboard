from __future__ import annotations

from typing import Any
from uuid import UUID

from app.db.connection import get_db_connection


class AccountRepository:
    def create_account(self, owner_id: UUID, name: str) -> dict[str, Any]:
        with get_db_connection(owner_id) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO public.accounts (owner_id, name)
                    VALUES (%s, %s)
                    RETURNING id, name, balance, created_at
                    """,
                    (owner_id, name),
                )
                row = cursor.fetchone()
                if row is None:
                    raise RuntimeError("Account insert did not return a row")
                return row

    def list_accounts(
        self, owner_id: UUID, *, search: str | None, page: int, page_size: int
    ) -> tuple[list[dict[str, Any]], int]:
        conditions = ["owner_id = %s"]
        parameters: list[object] = [owner_id]
        if search:
            conditions.append("(name ILIKE %s OR id::text ILIKE %s)")
            pattern = f"%{search}%"
            parameters.extend((pattern, pattern))

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        offset = (page - 1) * page_size

        with get_db_connection(owner_id) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    f"SELECT COUNT(*) AS total FROM public.accounts {where_clause}",
                    parameters,
                )
                count_row = cursor.fetchone()
                if count_row is None:
                    raise RuntimeError("Account count query did not return a row")
                total = count_row["total"]
                cursor.execute(
                    f"""
                    SELECT id, name, balance, created_at
                    FROM public.accounts
                    {where_clause}
                    ORDER BY created_at DESC, id DESC
                    LIMIT %s OFFSET %s
                    """,
                    (*parameters, page_size, offset),
                )
                return cursor.fetchall(), total

    def get_account(self, owner_id: UUID, account_id: UUID) -> dict[str, Any] | None:
        with get_db_connection(owner_id) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, name, balance, created_at
                    FROM public.accounts
                    WHERE id = %s AND owner_id = %s
                    """,
                    (account_id, owner_id),
                )
                return cursor.fetchone()
