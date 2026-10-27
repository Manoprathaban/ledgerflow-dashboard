from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_transaction_service
from app.schemas.transaction import (
    GlobalTransactionListResponse,
    TransactionResponse,
)
from app.security.auth import AuthenticatedUser, get_current_user
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=GlobalTransactionListResponse)
def list_transactions(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends(get_transaction_service)],
    search: Annotated[str | None, Query(max_length=200)] = None,
    transaction_type: Annotated[Literal["all", "credit", "debit"], Query(alias="type")] = "all",
    account_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict[str, object]:
    return service.list_transactions(
        current_user.id,
        search=search,
        transaction_type=transaction_type,
        account_id=account_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
        include_account_name=True,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends(get_transaction_service)],
) -> dict[str, object]:
    return service.get_transaction(current_user.id, transaction_id)
