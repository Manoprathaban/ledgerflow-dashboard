from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_transfer_service
from app.schemas.transfer import MoneyTransferRequest, MoneyTransferResponse
from app.security.auth import AuthenticatedUser, get_current_user
from app.services.transfer_service import TransferService

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.post("", response_model=MoneyTransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    request: MoneyTransferRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TransferService, Depends(get_transfer_service)],
) -> dict[str, object]:
    return service.create_transfer(current_user.id, request)
