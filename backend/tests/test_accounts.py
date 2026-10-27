from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

import pytest

from app.dependencies import get_account_service
from app.main import app
from app.services.account_service import AccountService

ACCOUNT_ID = UUID("5e9f8eb4-9831-4d0a-b9b0-9ff5f41d6722")
CREATED_AT = datetime(2026, 10, 26, 12, 0, tzinfo=UTC)


class FakeAccountRepository:
    def __init__(self) -> None:
        self.accounts = [
            {
                "id": ACCOUNT_ID,
                "name": "Alice Johnson",
                "balance": Decimal("1250.00"),
                "created_at": CREATED_AT,
            }
        ]
        self.created_name: str | None = None
        self.owner_id: UUID | None = None

    def create_account(self, owner_id: UUID, name: str) -> dict[str, object]:
        self.owner_id = owner_id
        self.created_name = name
        return {
            "id": ACCOUNT_ID,
            "name": name,
            "balance": Decimal("0.00"),
            "created_at": CREATED_AT,
        }

    def list_accounts(
        self, owner_id: UUID, *, search: str | None, page: int, page_size: int
    ) -> tuple[list[dict[str, object]], int]:
        self.owner_id = owner_id
        return self.accounts, 21

    def get_account(self, owner_id: UUID, account_id: UUID) -> dict[str, object] | None:
        self.owner_id = owner_id
        return next((account for account in self.accounts if account["id"] == account_id), None)


@pytest.fixture
def account_api(client):
    repository = FakeAccountRepository()
    app.dependency_overrides[get_account_service] = lambda: AccountService(repository)
    yield client, repository
    app.dependency_overrides.pop(get_account_service, None)


def test_create_account_trims_name_and_returns_created_account(account_api):
    client, repository = account_api

    response = client.post("/api/v1/accounts", json={"name": "  Alice Johnson  "})

    assert response.status_code == 201
    assert response.json() == {
        "id": str(ACCOUNT_ID),
        "name": "Alice Johnson",
        "balance": "0.00",
        "created_at": "2026-10-26T12:00:00Z",
    }
    assert repository.created_name == "Alice Johnson"


def test_list_accounts_returns_paginated_envelope(account_api):
    client, _ = account_api

    response = client.get("/api/v1/accounts?search=alice&page=2&page_size=10")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": str(ACCOUNT_ID),
                "name": "Alice Johnson",
                "balance": "1250.00",
                "created_at": "2026-10-26T12:00:00Z",
            }
        ],
        "page": 2,
        "page_size": 10,
        "total": 21,
        "total_pages": 3,
    }


def test_list_accounts_uses_default_pagination(account_api):
    client, _ = account_api

    response = client.get("/api/v1/accounts")

    assert response.status_code == 200
    assert response.json()["page"] == 1
    assert response.json()["page_size"] == 10
    assert response.json()["total"] == 21
    assert response.json()["total_pages"] == 3


def test_get_account_and_balance(account_api):
    client, _ = account_api

    account_response = client.get(f"/api/v1/accounts/{ACCOUNT_ID}")
    balance_response = client.get(f"/api/v1/accounts/{ACCOUNT_ID}/balance")

    assert account_response.status_code == 200
    assert account_response.json() == {
        "id": str(ACCOUNT_ID),
        "name": "Alice Johnson",
        "balance": "1250.00",
        "created_at": "2026-10-26T12:00:00Z",
    }
    assert balance_response.status_code == 200
    assert balance_response.json() == {
        "account_id": str(ACCOUNT_ID),
        "balance": "1250.00",
    }


def test_missing_account_uses_error_envelope(account_api):
    client, _ = account_api

    response = client.get("/api/v1/accounts/00000000-0000-4000-8000-000000000001")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "ACCOUNT_NOT_FOUND",
            "message": "The requested account was not found.",
        }
    }


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/v1/accounts/not-a-uuid", None),
        ("/api/v1/accounts", {"name": "   "}),
    ],
)
def test_invalid_account_requests_use_validation_error_envelope(account_api, path, payload):
    client, _ = account_api

    response = client.get(path) if payload is None else client.post(path, json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert response.json()["error"]["details"]


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({}, "name"),
        ({"name": "Alice", "balance": "10.00"}, "balance"),
    ],
)
def test_account_create_validation_error_response(account_api, payload, field):
    client, _ = account_api

    response = client.post("/api/v1/accounts", json=payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["message"] == "The request payload is invalid."
    assert error["details"][0]["field"] == field
    assert isinstance(error["details"][0]["issue"], str)


def test_invalid_pagination_uses_validation_error_envelope(account_api):
    client, _ = account_api

    response = client.get("/api/v1/accounts?page=0&page_size=101")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert len(response.json()["error"]["details"]) == 2


def test_search_query_validation_error_response(account_api):
    client, _ = account_api

    response = client.get(f"/api/v1/accounts?search={'x' * 201}")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert response.json()["error"]["details"][0]["field"] == "search"
