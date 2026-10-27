from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from app.repositories.transfer_repository import TransferRepository
from app.schemas.transfer import MoneyTransferRequest


class TransferService:
    def __init__(self, repository: TransferRepository | None = None) -> None:
        self.repository = repository or TransferRepository()

    def create_transfer(self, owner_id: UUID, request: MoneyTransferRequest) -> dict[str, Any]:
        transfer = self.repository.create_transfer(owner_id, request)
        return {
            **transfer,
            "source_transaction": self._format_transaction(transfer["source_transaction"]),
            "destination_transaction": self._format_transaction(
                transfer["destination_transaction"]
            ),
            "source_balance": f"{Decimal(transfer['source_balance']):.2f}",
            "destination_balance": f"{Decimal(transfer['destination_balance']):.2f}",
        }

    @staticmethod
    def _format_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
        return {
            **transaction,
            "amount": f"{Decimal(transaction['amount']):.2f}",
        }
