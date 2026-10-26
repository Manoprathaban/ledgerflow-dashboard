from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

TransactionType = Literal["credit", "debit"]


class TransactionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: TransactionType
    amount: Annotated[str, Field(..., strict=True, pattern=r"^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$")]
    description: Annotated[str, Field(max_length=500)] = ""
    reference_id: Annotated[str, Field(..., min_length=1, max_length=200)]

    @field_validator("amount")
    @classmethod
    def require_positive_amount(cls, value: str) -> str:
        if Decimal(value) <= 0:
            raise ValueError("Amount must be greater than zero")
        return value

    @field_validator("description", mode="before")
    @classmethod
    def trim_description(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else "" if value is None else value

    @field_validator("reference_id", mode="before")
    @classmethod
    def normalize_reference_id(cls, value: object) -> object:
        return value.strip().casefold() if isinstance(value, str) else value


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    type: TransactionType
    amount: str
    description: str
    reference_id: str
    created_at: datetime


class TransactionListItem(TransactionResponse):
    account_name: str


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class GlobalTransactionListResponse(BaseModel):
    items: list[TransactionListItem]
    page: int
    page_size: int
    total: int
    total_pages: int
