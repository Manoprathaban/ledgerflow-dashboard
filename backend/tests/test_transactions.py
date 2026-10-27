from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

import pytest

from app.core.exceptions import (
    AccountNotFoundError,
    BalanceLimitExceededError,
    DuplicateReferenceError,
    InsufficientBalanceError,
)
from app.dependencies import get_transaction_service
from app.main import app
from app.services.transaction_service import TransactionService

ACCOUNT_ID = UUID("5e9f8eb4-9831-4d0a-b9b0-9ff5f41d6722")
TRANSACTION_ID = UUID("8ec6d6ca-2c2a-4abc-89a3-fafee1a6d15c")
CREATED_AT = datetime(2026, 10, 26, 12, 15, tzinfo=UTC)


def transaction_row(**overrides):
    return {
        "id": TRANSACTION_ID,
        "account_id": ACCOUNT_ID,
        "type": "credit",
        "amount": Decimal("125.50"),
        "description": "Invoice payment",
        "reference_id": "inv-1024",
        "created_at": CREATED_AT,
        **overrides,
    }


class FakeTransactionRepository:
    def __init__(self) -> None:
        self.transaction = transaction_row()
        self.created_args: tuple[UUID, UUID, object] | None = None
        self.list_args: dict[str, object] | None = None
        self.create_error: Exception | None = None
        self.account_exists = True

    def create_transaction(self, owner_id, account_id, request):
        self.created_args = (owner_id, account_id, request)
        if self.create_error is not None:
            raise self.create_error
        return {
            **self.transaction,
            "type": request.type,
            "amount": Decimal(request.amount),
            "description": request.description,
            "reference_id": request.reference_id,
        }

    def get_transaction(self, owner_id, transaction_id):
        if transaction_id != self.transaction["id"]:
            return None
        return self.transaction

    def list_transactions(
        self,
        owner_id,
        *,
        account_id,
        search,
        transaction_type,
        start_date,
        end_date,
        page,
        page_size,
        include_account_name=False,
    ):
        self.list_args = {
            "owner_id": owner_id,
            "account_id": account_id,
            "search": search,
            "transaction_type": transaction_type,
            "start_date": start_date,
            "end_date": end_date,
            "page": page,
            "page_size": page_size,
            "include_account_name": include_account_name,
        }
        if account_id is not None and not self.account_exists:
            raise AccountNotFoundError(account_id)
        row = {**self.transaction, "account_name": "Alice Johnson"}
        return [row], 21


@pytest.fixture
def transaction_api(client):
    repository = FakeTransactionRepository()
    app.dependency_overrides[get_transaction_service] = lambda: TransactionService(repository)
    yield client, repository
    app.dependency_overrides.pop(get_transaction_service, None)


def test_api_allows_browser_cors_preflight(client):
    response = client.options(
        "/api/v1/accounts",
        headers={
            "Origin": "https://ledgerflow-dashboard.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_create_account_transaction_returns_contract_response(transaction_api):
    client, repository = transaction_api

    response = client.post(
        f"/api/v1/accounts/{ACCOUNT_ID}/transactions",
        json={
            "type": "credit",
            "amount": "125.50",
            "description": " Invoice payment ",
            "reference_id": " INV-1024 ",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": str(TRANSACTION_ID),
        "account_id": str(ACCOUNT_ID),
        "type": "credit",
        "amount": "125.50",
        "description": "Invoice payment",
        "reference_id": "inv-1024",
        "created_at": "2026-10-26T12:15:00Z",
    }
    assert repository.created_args[1] == ACCOUNT_ID


def test_create_account_transaction_allows_omitted_description(transaction_api):
    client, _ = transaction_api

    response = client.post(
        f"/api/v1/accounts/{ACCOUNT_ID}/transactions",
        json={"type": "debit", "amount": "1", "reference_id": "ref-1"},
    )

    assert response.status_code == 201
    assert response.json()["description"] == ""
    assert response.json()["amount"] == "1.00"


@pytest.mark.parametrize(
    ("error", "status_code", "error_code"),
    [
        (AccountNotFoundError(ACCOUNT_ID), 404, "ACCOUNT_NOT_FOUND"),
        (DuplicateReferenceError("ref-1"), 409, "DUPLICATE_REFERENCE"),
        (InsufficientBalanceError(), 409, "INSUFFICIENT_BALANCE"),
        (BalanceLimitExceededError(), 409, "BALANCE_LIMIT_EXCEEDED"),
    ],
)
def test_create_transaction_domain_errors_have_contract_responses(
    transaction_api, error, status_code, error_code
):
    client, repository = transaction_api
    repository.create_error = error

    response = client.post(
        f"/api/v1/accounts/{ACCOUNT_ID}/transactions",
        json={"type": "credit", "amount": "1.00", "reference_id": "ref-1"},
    )

    assert response.status_code == status_code
    assert response.json()["error"]["code"] == error_code
    assert response.json()["error"]["message"]


def test_create_transaction_invalid_payload_uses_validation_response(transaction_api):
    client, _ = transaction_api

    response = client.post(
        f"/api/v1/accounts/{ACCOUNT_ID}/transactions",
        json={"type": "credit", "amount": "0", "reference_id": "ref-1"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert response.json()["error"]["details"][0]["field"] == "amount"


def test_get_transaction_returns_response_and_not_found_error(transaction_api):
    client, _ = transaction_api

    response = client.get(f"/api/v1/transactions/{TRANSACTION_ID}")
    missing = client.get("/api/v1/transactions/00000000-0000-4000-8000-000000000001")

    assert response.status_code == 200
    assert response.json() == {
        "id": str(TRANSACTION_ID),
        "account_id": str(ACCOUNT_ID),
        "type": "credit",
        "amount": "125.50",
        "description": "Invoice payment",
        "reference_id": "inv-1024",
        "created_at": "2026-10-26T12:15:00Z",
    }
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "TRANSACTION_NOT_FOUND"


def test_global_transaction_list_response_and_filters(transaction_api):
    client, repository = transaction_api

    response = client.get(
        "/api/v1/transactions?search=invoice&type=credit"
        f"&account_id={ACCOUNT_ID}&start_date=2026-10-01&end_date=2026-10-31"
        "&page=2&page_size=10"
    )

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": str(TRANSACTION_ID),
                "account_id": str(ACCOUNT_ID),
                "account_name": "Alice Johnson",
                "type": "credit",
                "amount": "125.50",
                "description": "Invoice payment",
                "reference_id": "inv-1024",
                "created_at": "2026-10-26T12:15:00Z",
            }
        ],
        "page": 2,
        "page_size": 10,
        "total": 21,
        "total_pages": 3,
    }
    assert repository.list_args == {
        "owner_id": UUID("00000000-0000-4000-8000-000000000001"),
        "account_id": ACCOUNT_ID,
        "search": "invoice",
        "transaction_type": "credit",
        "start_date": date(2026, 10, 1),
        "end_date": date(2026, 10, 31),
        "page": 2,
        "page_size": 10,
        "include_account_name": True,
    }


def test_account_transaction_history_response(transaction_api):
    client, repository = transaction_api

    response = client.get(f"/api/v1/accounts/{ACCOUNT_ID}/transactions?type=debit&page_size=5")

    assert response.status_code == 200
    assert response.json()["items"][0]["amount"] == "125.50"
    assert response.json()["items"][0]["account_id"] == str(ACCOUNT_ID)
    assert response.json()["page"] == 1
    assert response.json()["page_size"] == 5
    assert repository.list_args["account_id"] == ACCOUNT_ID
    assert repository.list_args["transaction_type"] == "debit"
    assert repository.list_args["include_account_name"] is False


def test_invalid_transaction_filters_use_validation_error_response(transaction_api):
    client, _ = transaction_api

    invalid_type = client.get("/api/v1/transactions?type=transfer")
    invalid_date = client.get("/api/v1/transactions?start_date=not-a-date")
    inverted_range = client.get("/api/v1/transactions?start_date=2026-10-02&end_date=2026-10-01")

    for response in (invalid_type, invalid_date, inverted_range):
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_account_history_unknown_account_returns_not_found(transaction_api):
    client, repository = transaction_api
    repository.account_exists = False

    response = client.get(f"/api/v1/accounts/{ACCOUNT_ID}/transactions")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ACCOUNT_NOT_FOUND"


def test_invalid_transaction_id_returns_validation_error(transaction_api):
    client, _ = transaction_api

    response = client.get("/api/v1/transactions/not-a-uuid")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
