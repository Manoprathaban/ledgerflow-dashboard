"""Simple dependency wiring for the backend application.

The foundation keeps this intentionally minimal and avoids heavy abstractions.
"""

from app.services.account_service import AccountService
from app.services.transaction_service import TransactionService


def get_account_service() -> AccountService:
    return AccountService()


def get_transaction_service() -> TransactionService:
    return TransactionService()
