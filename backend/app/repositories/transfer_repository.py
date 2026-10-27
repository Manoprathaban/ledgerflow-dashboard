from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from app.core.exceptions import (
    AccountNotFoundError,
    BalanceLimitExceededError,
    InsufficientBalanceError,
)
from app.db.transaction_manager import transaction_manager
from app.repositories.transaction_repository import MAX_BALANCE
from app.schemas.transfer import MoneyTransferRequest


class TransferRepository:
    def create_transfer(self, owner_id: UUID, request: MoneyTransferRequest) -> dict[str, Any]:
        transfer_id = uuid4()
        reference_prefix = f"transfer-{transfer_id.hex}"
        account_ids = sorted((request.source_account_id, request.destination_account_id))

        with transaction_manager(owner_id) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, name, balance
                    FROM public.accounts
                    WHERE owner_id = %s AND id IN (%s, %s)
                    ORDER BY id
                    FOR UPDATE
                    """,
                    (owner_id, *account_ids),
                )
                accounts = {row["id"]: row for row in cursor.fetchall()}

                source = accounts.get(request.source_account_id)
                if source is None:
                    raise AccountNotFoundError(request.source_account_id)
                destination = accounts.get(request.destination_account_id)
                if destination is None:
                    raise AccountNotFoundError(request.destination_account_id)

                amount = Decimal(request.amount)
                source_balance = Decimal(source["balance"])
                destination_balance = Decimal(destination["balance"])
                if source_balance < amount:
                    raise InsufficientBalanceError()
                if destination_balance + amount > MAX_BALANCE:
                    raise BalanceLimitExceededError()

                cursor.execute(
                    """
                    INSERT INTO public.transfers
                        (id, owner_id, source_account_id, destination_account_id,
                         amount, description)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        transfer_id,
                        owner_id,
                        request.source_account_id,
                        request.destination_account_id,
                        amount,
                        request.description,
                    ),
                )
                source_transaction = self._insert_transaction(
                    cursor,
                    transfer_id=transfer_id,
                    account_id=request.source_account_id,
                    transaction_type="debit",
                    amount=amount,
                    description=self._description(
                        f"Transfer to {destination['name']}", request.description
                    ),
                    reference_id=f"{reference_prefix}-debit",
                )
                destination_transaction = self._insert_transaction(
                    cursor,
                    transfer_id=transfer_id,
                    account_id=request.destination_account_id,
                    transaction_type="credit",
                    amount=amount,
                    description=self._description(
                        f"Transfer from {source['name']}", request.description
                    ),
                    reference_id=f"{reference_prefix}-credit",
                )

                new_source_balance = source_balance - amount
                new_destination_balance = destination_balance + amount
                cursor.execute(
                    """
                    UPDATE public.accounts SET balance = %s
                    WHERE id = %s AND owner_id = %s
                    """,
                    (new_source_balance, request.source_account_id, owner_id),
                )
                cursor.execute(
                    """
                    UPDATE public.accounts SET balance = %s
                    WHERE id = %s AND owner_id = %s
                    """,
                    (new_destination_balance, request.destination_account_id, owner_id),
                )

                return {
                    "transfer_id": transfer_id,
                    "source_transaction": source_transaction,
                    "destination_transaction": destination_transaction,
                    "source_balance": new_source_balance,
                    "destination_balance": new_destination_balance,
                }

    @staticmethod
    def _insert_transaction(
        cursor: Any,
        *,
        transfer_id: UUID,
        account_id: UUID,
        transaction_type: str,
        amount: Decimal,
        description: str,
        reference_id: str,
    ) -> dict[str, Any]:
        cursor.execute(
            """
            INSERT INTO public.transactions
                (account_id, type, amount, description, reference_id, transfer_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, account_id, type, amount, description, reference_id, created_at
            """,
            (account_id, transaction_type, amount, description, reference_id, transfer_id),
        )
        transaction = cursor.fetchone()
        if transaction is None:
            raise RuntimeError("Transfer transaction insert did not return a row")
        return transaction

    @staticmethod
    def _description(prefix: str, description: str) -> str:
        if not description:
            return prefix
        return f"{prefix}: {description[: 500 - len(prefix) - 2]}"
