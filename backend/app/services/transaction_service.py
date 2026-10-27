from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from app.core.exceptions import InvalidDateRangeError, TransactionNotFoundError
from app.repositories.transaction_repository import (
    TransactionRepository,
    TransactionTypeFilter,
)
from app.schemas.transaction import TransactionCreateRequest


class TransactionService:
    def __init__(self, repository: TransactionRepository | None = None) -> None:
        self.repository = repository or TransactionRepository()

    def create_transaction(
        self, owner_id: UUID, account_id: UUID, request: TransactionCreateRequest
    ) -> dict[str, Any]:
        transaction = self.repository.create_transaction(owner_id, account_id, request)
        return self._format_transaction(transaction)

    def get_transaction(self, owner_id: UUID, transaction_id: UUID) -> dict[str, Any]:
        transaction = self.repository.get_transaction(owner_id, transaction_id)
        if transaction is None:
            raise TransactionNotFoundError(transaction_id)
        return self._format_transaction(transaction)

    def list_transactions(
        self,
        owner_id: UUID,
        *,
        account_id: UUID | None = None,
        search: str | None = None,
        transaction_type: TransactionTypeFilter = "all",
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 10,
        include_account_name: bool = False,
    ) -> dict[str, Any]:
        if start_date is not None and end_date is not None and start_date > end_date:
            raise InvalidDateRangeError()
        transactions, total = self.repository.list_transactions(
            owner_id,
            account_id=account_id,
            search=search,
            transaction_type=transaction_type,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
            include_account_name=include_account_name,
        )
        return {
            "items": [
                self._format_transaction(transaction, include_account_name)
                for transaction in transactions
            ],
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        }

    @staticmethod
    def _format_transaction(
        transaction: dict[str, Any], include_account_name: bool = False
    ) -> dict[str, Any]:
        formatted = {
            **transaction,
            "amount": f"{Decimal(transaction['amount']):.2f}",
        }
        if include_account_name:
            return formatted
        formatted.pop("account_name", None)
        return formatted
