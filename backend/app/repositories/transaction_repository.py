from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from psycopg.errors import UniqueViolation

from app.core.exceptions import (
    AccountNotFoundError,
    BalanceLimitExceededError,
    DuplicateReferenceError,
    InsufficientBalanceError,
)
from app.db.connection import get_db_connection
from app.db.transaction_manager import transaction_manager
from app.schemas.transaction import TransactionCreateRequest

MAX_BALANCE = Decimal("9999999999999999.99")
TransactionTypeFilter = Literal["all", "credit", "debit"]


def _date_bounds(
    start_date: date | None, end_date: date | None
) -> tuple[datetime | None, datetime | None]:
    start = datetime.combine(start_date, time.min, tzinfo=UTC) if start_date else None
    end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=UTC) if end_date else None
    return start, end


def _search_pattern(search: str) -> str:
    escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


class TransactionRepository:
    def create_transaction(
        self, account_id: UUID, request: TransactionCreateRequest
    ) -> dict[str, Any]:
        amount = Decimal(request.amount)
        delta = amount if request.type == "credit" else -amount
        try:
            with transaction_manager() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT balance
                        FROM public.accounts
                        WHERE id = %s
                        FOR UPDATE
                        """,
                        (account_id,),
                    )
                    account = cursor.fetchone()
                    if account is None:
                        raise AccountNotFoundError(account_id)

                    balance = Decimal(account["balance"])
                    new_balance = balance + delta
                    if request.type == "debit" and new_balance < 0:
                        raise InsufficientBalanceError()
                    if new_balance > MAX_BALANCE:
                        raise BalanceLimitExceededError()

                    cursor.execute(
                        """
                        INSERT INTO public.transactions
                            (account_id, type, amount, description, reference_id)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, account_id, type, amount, description,
                                  reference_id, created_at
                        """,
                        (
                            account_id,
                            request.type,
                            amount,
                            request.description,
                            request.reference_id,
                        ),
                    )
                    transaction = cursor.fetchone()
                    if transaction is None:
                        raise RuntimeError("Transaction insert did not return a row")

                    cursor.execute(
                        "UPDATE public.accounts SET balance = %s WHERE id = %s",
                        (new_balance, account_id),
                    )
                    return transaction
        except UniqueViolation as exc:
            raise DuplicateReferenceError(request.reference_id) from exc

    def get_transaction(self, transaction_id: UUID) -> dict[str, Any] | None:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, account_id, type, amount, description, reference_id, created_at
                    FROM public.transactions
                    WHERE id = %s
                    """,
                    (transaction_id,),
                )
                return cursor.fetchone()

    def list_transactions(
        self,
        *,
        account_id: UUID | None,
        search: str | None,
        transaction_type: TransactionTypeFilter,
        start_date: date | None,
        end_date: date | None,
        page: int,
        page_size: int,
        include_account_name: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        conditions: list[str] = []
        parameters: list[object] = []
        if account_id is not None:
            conditions.append("t.account_id = %s")
            parameters.append(account_id)
        if transaction_type != "all":
            conditions.append("t.type = %s")
            parameters.append(transaction_type)
        if start_date is not None:
            conditions.append("t.created_at >= %s")
        if end_date is not None:
            conditions.append("t.created_at < %s")
        start, end = _date_bounds(start_date, end_date)
        if start is not None:
            parameters.append(start)
        if end is not None:
            parameters.append(end)
        if search:
            pattern = _search_pattern(search)
            search_fields = ["t.id::text ILIKE %s"]
            if account_id is None:
                search_fields.append("t.account_id::text ILIKE %s")
            search_fields.extend(("t.description ILIKE %s", "t.reference_id ILIKE %s"))
            conditions.append(f"({' OR '.join(search_fields)})")
            parameters.extend([pattern] * len(search_fields))

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        join_clause = (
            "JOIN public.accounts a ON a.id = t.account_id" if include_account_name else ""
        )
        select_account_name = ", a.name AS account_name" if include_account_name else ""
        offset = (page - 1) * page_size

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if account_id is not None:
                    cursor.execute(
                        "SELECT 1 FROM public.accounts WHERE id = %s",
                        (account_id,),
                    )
                    if cursor.fetchone() is None:
                        raise AccountNotFoundError(account_id)
                cursor.execute(
                    f"""
                    SELECT COUNT(*) AS total
                    FROM public.transactions t
                    {join_clause}
                    {where_clause}
                    """,
                    parameters,
                )
                count_row = cursor.fetchone()
                if count_row is None:
                    raise RuntimeError("Transaction count query did not return a row")
                total = count_row["total"]
                cursor.execute(
                    f"""
                    SELECT t.id, t.account_id, t.type, t.amount, t.description,
                           t.reference_id, t.created_at {select_account_name}
                    FROM public.transactions t
                    {join_clause}
                    {where_clause}
                    ORDER BY t.created_at DESC, t.id DESC
                    LIMIT %s OFFSET %s
                    """,
                    (*parameters, page_size, offset),
                )
                return cursor.fetchall(), total
