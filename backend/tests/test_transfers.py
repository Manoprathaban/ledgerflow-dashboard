from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

import pytest

from app.core.exceptions import (
    AccountNotFoundError,
    BalanceLimitExceededError,
    InsufficientBalanceError,
)
from app.db import transaction_manager as transaction_manager_module
from app.dependencies import get_transfer_service
from app.main import app
from app.repositories.transfer_repository import TransferRepository
from app.schemas.transfer import MoneyTransferRequest
from app.services.transfer_service import TransferService

SOURCE_ID = UUID("5e9f8eb4-9831-4d0a-b9b0-9ff5f41d6722")
DESTINATION_ID = UUID("47d65b2d-e0c1-4a43-92a5-b79da56f4c10")
CREATED_AT = datetime(2026, 10, 27, 8, 0, tzinfo=UTC)
TRANSFER_ID = UUID("8ec6d6ca-2c2a-4abc-89a3-fafee1a6d15c")


def account_row(account_id: UUID, name: str, balance: str) -> dict[str, object]:
    return {"id": account_id, "name": name, "balance": Decimal(balance)}


class FakeTransferRepository:
    def __init__(self) -> None:
        self.transfer = {
            "transfer_id": TRANSFER_ID,
            "source_transaction": {
                "id": UUID("1ec6d6ca-2c2a-4abc-89a3-fafee1a6d15c"),
                "account_id": SOURCE_ID,
                "type": "debit",
                "amount": Decimal("30.00"),
                "description": "Transfer to Savings",
                "reference_id": "transfer-out",
                "created_at": CREATED_AT,
            },
            "destination_transaction": {
                "id": UUID("2ec6d6ca-2c2a-4abc-89a3-fafee1a6d15c"),
                "account_id": DESTINATION_ID,
                "type": "credit",
                "amount": Decimal("30.00"),
                "description": "Transfer from Checking",
                "reference_id": "transfer-in",
                "created_at": CREATED_AT,
            },
            "source_balance": Decimal("70.00"),
            "destination_balance": Decimal("80.00"),
        }
        self.error: Exception | None = None

    def create_transfer(self, request: MoneyTransferRequest) -> dict[str, object]:
        if self.error is not None:
            raise self.error
        return self.transfer


@pytest.fixture
def transfer_api(client):
    repository = FakeTransferRepository()
    app.dependency_overrides[get_transfer_service] = lambda: TransferService(repository)
    yield client, repository
    app.dependency_overrides.pop(get_transfer_service, None)


def transfer_payload(**overrides):
    return {
        "source_account_id": str(SOURCE_ID),
        "destination_account_id": str(DESTINATION_ID),
        "amount": "30.00",
        "description": "monthly savings",
        **overrides,
    }


def test_create_transfer_returns_both_ledger_entries_and_balances(transfer_api):
    client, _ = transfer_api

    response = client.post("/api/v1/transfers", json=transfer_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["transfer_id"] == str(TRANSFER_ID)
    assert body["source_transaction"]["type"] == "debit"
    assert body["source_transaction"]["amount"] == "30.00"
    assert body["destination_transaction"]["type"] == "credit"
    assert body["destination_transaction"]["amount"] == "30.00"
    assert body["source_balance"] == "70.00"
    assert body["destination_balance"] == "80.00"


@pytest.mark.parametrize(
    ("error", "status_code", "error_code"),
    [
        (AccountNotFoundError(SOURCE_ID), 404, "ACCOUNT_NOT_FOUND"),
        (InsufficientBalanceError(), 409, "INSUFFICIENT_BALANCE"),
    ],
)
def test_transfer_domain_errors_use_api_error_envelope(
    transfer_api, error, status_code, error_code
):
    client, repository = transfer_api
    repository.error = error

    response = client.post("/api/v1/transfers", json=transfer_payload())

    assert response.status_code == status_code
    assert response.json()["error"]["code"] == error_code


@pytest.mark.parametrize(
    "payload",
    [
        transfer_payload(source_account_id=str(DESTINATION_ID)),
        transfer_payload(amount="0"),
        transfer_payload(amount="1.001"),
        transfer_payload(extra="not allowed"),
    ],
)
def test_transfer_rejects_invalid_payloads(transfer_api, payload):
    client, _ = transfer_api

    response = client.post("/api/v1/transfers", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


class FakeCursor:
    def __init__(
        self,
        accounts: list[dict[str, object]],
        *,
        fail_on_insert: int | None = None,
    ) -> None:
        self.accounts = accounts
        self.fail_on_insert = fail_on_insert
        self.insert_count = 0
        self.calls: list[tuple[str, tuple[object, ...] | None]] = []
        self.last_insert: tuple[object, ...] | None = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, query: str, params: tuple[object, ...] | None = None) -> None:
        self.calls.append((query, params))
        if "INSERT INTO public.transactions" in query:
            self.insert_count += 1
            if self.insert_count == self.fail_on_insert:
                raise RuntimeError("Simulated destination insert failure")
            self.last_insert = params

    def fetchall(self) -> list[dict[str, object]]:
        return self.accounts

    def fetchone(self) -> dict[str, object]:
        assert self.last_insert is not None
        account_id, transaction_type, amount, description, reference_id = self.last_insert
        return {
            "id": UUID(int=self.insert_count),
            "account_id": account_id,
            "type": transaction_type,
            "amount": amount,
            "description": description,
            "reference_id": reference_id,
            "created_at": CREATED_AT,
        }


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.fake_cursor = cursor
        self.rolled_back = False
        self.committed = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self) -> FakeCursor:
        return self.fake_cursor

    class TransactionContext:
        def __init__(self, connection: FakeConnection) -> None:
            self.connection = connection

        def __enter__(self):
            return self

        def __exit__(self, exc_type, *_):
            self.connection.rolled_back = exc_type is not None
            self.connection.committed = exc_type is None
            return False

    def transaction(self) -> TransactionContext:
        return self.TransactionContext(self)


def test_repository_transfer_commits_two_entries_and_balance_updates(monkeypatch):
    cursor = FakeCursor(
        [
            account_row(SOURCE_ID, "Checking", "100.00"),
            account_row(DESTINATION_ID, "Savings", "50.00"),
        ]
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(transaction_manager_module, "get_db_connection", lambda: connection)
    request = MoneyTransferRequest.model_validate(transfer_payload())

    transfer = TransferRepository().create_transfer(request)

    assert connection.committed
    assert not connection.rolled_back
    assert transfer["source_balance"] == Decimal("70.00")
    assert transfer["destination_balance"] == Decimal("80.00")
    assert cursor.insert_count == 2
    lock_query, lock_params = cursor.calls[0]
    assert "ORDER BY id" in lock_query
    assert lock_params == list(sorted((SOURCE_ID, DESTINATION_ID)))
    updates = [(query, params) for query, params in cursor.calls if query.startswith("UPDATE")]
    assert len(updates) == 2
    assert [params[0] for _, params in updates] == [Decimal("70.00"), Decimal("80.00")]


def test_repository_rolls_back_when_destination_entry_fails(monkeypatch):
    cursor = FakeCursor(
        [
            account_row(SOURCE_ID, "Checking", "100.00"),
            account_row(DESTINATION_ID, "Savings", "50.00"),
        ],
        fail_on_insert=2,
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(transaction_manager_module, "get_db_connection", lambda: connection)
    request = MoneyTransferRequest.model_validate(transfer_payload())

    with pytest.raises(RuntimeError, match="destination insert"):
        TransferRepository().create_transfer(request)

    assert connection.rolled_back
    assert not connection.committed
    assert not any(query.startswith("UPDATE") for query, _ in cursor.calls)


def test_repository_rejects_insufficient_balance_before_writing(monkeypatch):
    cursor = FakeCursor(
        [
            account_row(SOURCE_ID, "Checking", "20.00"),
            account_row(DESTINATION_ID, "Savings", "50.00"),
        ]
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(transaction_manager_module, "get_db_connection", lambda: connection)
    request = MoneyTransferRequest.model_validate(transfer_payload())

    with pytest.raises(InsufficientBalanceError):
        TransferRepository().create_transfer(request)

    assert connection.rolled_back
    assert cursor.insert_count == 0


def test_repository_rejects_missing_destination_before_writing(monkeypatch):
    cursor = FakeCursor([account_row(SOURCE_ID, "Checking", "100.00")])
    connection = FakeConnection(cursor)
    monkeypatch.setattr(transaction_manager_module, "get_db_connection", lambda: connection)
    request = MoneyTransferRequest.model_validate(transfer_payload())

    with pytest.raises(AccountNotFoundError) as error:
        TransferRepository().create_transfer(request)

    assert error.value.account_id == DESTINATION_ID
    assert connection.rolled_back
    assert cursor.insert_count == 0


def test_repository_rejects_destination_balance_overflow_before_writing(monkeypatch):
    cursor = FakeCursor(
        [
            account_row(SOURCE_ID, "Checking", "100.00"),
            account_row(DESTINATION_ID, "Savings", "9999999999999999.99"),
        ]
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(transaction_manager_module, "get_db_connection", lambda: connection)
    request = MoneyTransferRequest.model_validate(transfer_payload(amount="0.01"))

    with pytest.raises(BalanceLimitExceededError):
        TransferRepository().create_transfer(request)

    assert connection.rolled_back
    assert cursor.insert_count == 0
