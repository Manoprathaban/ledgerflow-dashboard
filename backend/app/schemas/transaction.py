from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

TransactionType = Literal["credit", "debit"]


class TransactionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: str
    type: TransactionType
    amount: Annotated[str, Field(..., pattern=r"^\d+(\.\d{2})?$")]
    description: str | None = None
    reference_id: Annotated[str, Field(..., min_length=1, max_length=200)]


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    type: TransactionType
    amount: str
    description: str | None = None
    reference_id: str
    created_at: str
