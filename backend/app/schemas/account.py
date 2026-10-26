from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class AccountCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    holder_name: Annotated[str, Field(..., min_length=1, max_length=200)]
    initial_balance: Annotated[str, Field(default="0.00", pattern=r"^\d+(\.\d{2})?$")]


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    holder_name: str
    balance: str
    created_at: str
