from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from app.core.exceptions import AccountNotFoundError
from app.repositories.account_repository import AccountRepository


class AccountService:
    def __init__(self, repository: AccountRepository | None = None) -> None:
        self.repository = repository or AccountRepository()

    def create_account(self, name: str) -> dict[str, Any]:
        return self._format_account(self.repository.create_account(name))

    def list_accounts(self, *, search: str | None, page: int, page_size: int) -> dict[str, Any]:
        accounts, total = self.repository.list_accounts(
            search=search, page=page, page_size=page_size
        )
        return {
            "items": [self._format_account(account) for account in accounts],
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        }

    def get_account(self, account_id: UUID) -> dict[str, Any]:
        account = self.repository.get_account(account_id)
        if account is None:
            raise AccountNotFoundError(account_id)
        return self._format_account(account)

    def get_balance(self, account_id: UUID) -> dict[str, Any]:
        account = self.repository.get_account(account_id)
        if account is None:
            raise AccountNotFoundError(account_id)
        return {
            "account_id": account["id"],
            "balance": self._format_balance(account["balance"]),
        }

    @staticmethod
    def _format_account(account: dict[str, Any]) -> dict[str, Any]:
        return {
            **account,
            "balance": AccountService._format_balance(account["balance"]),
        }

    @staticmethod
    def _format_balance(balance: Decimal | str) -> str:
        return f"{Decimal(balance):.2f}"
