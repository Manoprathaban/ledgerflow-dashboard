from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_account_service, get_transaction_service
from app.schemas.account import (
    AccountBalanceResponse,
    AccountCreateRequest,
    AccountListResponse,
    AccountResponse,
)
from app.schemas.transaction import (
    TransactionCreateRequest,
    TransactionListResponse,
    TransactionResponse,
)
from app.security.auth import AuthenticatedUser, get_current_user
from app.services.account_service import AccountService
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=AccountListResponse)
def list_accounts(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[AccountService, Depends(get_account_service)],
    search: Annotated[str | None, Query(max_length=200)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict[str, object]:
    return service.list_accounts(current_user.id, search=search, page=page, page_size=page_size)


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[AccountService, Depends(get_account_service)],
) -> dict[str, object]:
    return service.get_account(current_user.id, account_id)


@router.get("/{account_id}/balance", response_model=AccountBalanceResponse)
def get_account_balance(
    account_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[AccountService, Depends(get_account_service)],
) -> dict[str, object]:
    return service.get_balance(current_user.id, account_id)


@router.get("/{account_id}/transactions", response_model=TransactionListResponse)
def list_account_transactions(
    account_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends(get_transaction_service)],
    transaction_type: Annotated[Literal["all", "credit", "debit"], Query(alias="type")] = "all",
    search: Annotated[str | None, Query(max_length=200)] = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> dict[str, object]:
    return service.list_transactions(
        current_user.id,
        account_id=account_id,
        transaction_type=transaction_type,
        search=search,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/{account_id}/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_account_transaction(
    account_id: UUID,
    request: TransactionCreateRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends(get_transaction_service)],
) -> dict[str, object]:
    return service.create_transaction(current_user.id, account_id, request)


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    request: AccountCreateRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[AccountService, Depends(get_account_service)],
) -> dict[str, object]:
    return service.create_account(current_user.id, request.name)
