import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.requests import Request

from app.api.router import router as api_router
from app.core.config import get_settings
from app.core.exceptions import (
    AccountNotFoundError,
    BalanceLimitExceededError,
    DuplicateReferenceError,
    InsufficientBalanceError,
    InvalidDateRangeError,
    TransactionNotFoundError,
)

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend foundation for the Ledger transaction management system.",
)

app.include_router(api_router)


@app.exception_handler(DuplicateReferenceError)
async def duplicate_reference_handler(
    request: Request, exc: DuplicateReferenceError
) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "DUPLICATE_REFERENCE",
                "message": "A transaction with this reference already exists for the account.",
            }
        },
    )


@app.exception_handler(InsufficientBalanceError)
async def insufficient_balance_handler(
    request: Request, exc: InsufficientBalanceError
) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "INSUFFICIENT_BALANCE",
                "message": "The debit exceeds the available account balance.",
            }
        },
    )


@app.exception_handler(BalanceLimitExceededError)
async def balance_limit_handler(request: Request, exc: BalanceLimitExceededError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "BALANCE_LIMIT_EXCEEDED",
                "message": "The resulting balance exceeds the supported limit.",
            }
        },
    )


@app.exception_handler(TransactionNotFoundError)
async def transaction_not_found_handler(
    request: Request, exc: TransactionNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "TRANSACTION_NOT_FOUND",
                "message": "The requested transaction was not found.",
            }
        },
    )


@app.exception_handler(InvalidDateRangeError)
async def invalid_date_range_handler(request: Request, exc: InvalidDateRangeError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request payload is invalid.",
                "details": [
                    {
                        "field": "start_date",
                        "issue": "start_date must not be after end_date",
                    }
                ],
            }
        },
    )


@app.exception_handler(AccountNotFoundError)
async def account_not_found_handler(request: Request, exc: AccountNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "ACCOUNT_NOT_FOUND",
                "message": "The requested account was not found.",
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for error in exc.errors():
        location = error["loc"]
        if location and location[0] in {"body", "query", "path", "header", "cookie"}:
            location = location[1:]
        details.append(
            {
                "field": ".".join(str(part) for part in location),
                "issue": error["msg"],
            }
        )
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request payload is invalid.",
                "details": details,
            }
        },
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled API exception",
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            }
        },
    )


@app.get("/health")
def health_check() -> dict[str, str]:
    """Application liveness check.

    This does not claim database connectivity. It only confirms the FastAPI app is
    running and serving requests.
    """
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
    }
