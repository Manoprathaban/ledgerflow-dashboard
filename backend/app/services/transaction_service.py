"""Service layer for transaction workflows.

The implementation is intentionally minimal at this foundation stage.
"""

from __future__ import annotations

from app.repositories.transaction_repository import TransactionRepository


class TransactionService:
    def __init__(self, repository: TransactionRepository | None = None) -> None:
        self.repository = repository or TransactionRepository()

    def list_transactions(self):
        return self.repository.list_transactions()
