from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AccountCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, Field(..., min_length=1, max_length=200)]

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    balance: str
    created_at: datetime


class AccountListResponse(BaseModel):
    items: list[AccountResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class AccountBalanceResponse(BaseModel):
    account_id: UUID
    balance: str
