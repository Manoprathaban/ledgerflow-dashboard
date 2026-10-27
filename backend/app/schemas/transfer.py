from __future__ import annotations

from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.transaction import TransactionResponse


class MoneyTransferRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_account_id: UUID
    destination_account_id: UUID
    amount: Annotated[
        str,
        Field(
            strict=True,
            pattern=r"^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$",
        ),
    ]
    description: Annotated[str, Field(max_length=500)] = ""

    @model_validator(mode="after")
    def validate_transfer(self) -> MoneyTransferRequest:
        if self.source_account_id == self.destination_account_id:
            raise ValueError("Source and destination accounts must be different.")
        if Decimal(self.amount) <= 0:
            raise ValueError("Amount must be greater than zero.")
        return self

    @field_validator("description", mode="before")
    @classmethod
    def trim_description(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else "" if value is None else value


class MoneyTransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transfer_id: UUID
    source_transaction: TransactionResponse
    destination_transaction: TransactionResponse
    source_balance: str
    destination_balance: str
