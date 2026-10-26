"""Service layer for account operations.

The implementation is intentionally minimal at this foundation stage.
"""

from __future__ import annotations

from app.repositories.account_repository import AccountRepository


class AccountService:
    def __init__(self, repository: AccountRepository | None = None) -> None:
        self.repository = repository or AccountRepository()

    def list_accounts(self):
        return self.repository.list_accounts()
