import pytest
from pydantic import ValidationError

from app.schemas.account import AccountCreateRequest
from app.schemas.transaction import TransactionCreateRequest


@pytest.mark.parametrize(
    ("value", "expected"),
    [("Priya Sharma", "Priya Sharma"), ("  Priya Sharma  ", "Priya Sharma")],
)
def test_account_create_trims_valid_names(value, expected):
    request = AccountCreateRequest.model_validate({"name": value})

    assert request.name == expected


@pytest.mark.parametrize("name", ["", "   ", "\t\n", "x" * 201])
def test_account_create_rejects_blank_or_overlong_names(name):
    with pytest.raises(ValidationError):
        AccountCreateRequest.model_validate({"name": name})


@pytest.mark.parametrize("payload", [{}, {"name": "Priya", "balance": "500.00"}])
def test_account_create_rejects_missing_name_and_extra_fields(payload):
    with pytest.raises(ValidationError):
        AccountCreateRequest.model_validate(payload)


@pytest.mark.parametrize(
    ("payload", "expected_description", "expected_reference"),
    [
        (
            {
                "type": "credit",
                "amount": "12.5",
                "description": "  Invoice payment  ",
                "reference_id": "  INV-42  ",
            },
            "Invoice payment",
            "inv-42",
        ),
        (
            {"type": "debit", "amount": "1.00", "reference_id": "REF-2"},
            "",
            "ref-2",
        ),
        (
            {
                "type": "credit",
                "amount": "1",
                "description": "   ",
                "reference_id": "Ref-3",
            },
            "",
            "ref-3",
        ),
    ],
)
def test_transaction_create_normalizes_valid_fields(
    payload, expected_description, expected_reference
):
    request = TransactionCreateRequest.model_validate(payload)

    assert request.description == expected_description
    assert request.reference_id == expected_reference


@pytest.mark.parametrize(
    "amount",
    [
        "0",
        "0.00",
        "-1.00",
        "1.001",
        "01.00",
        "10000000000000000.00",
        "",
        "1e2",
        1.0,
        None,
    ],
)
def test_transaction_create_rejects_invalid_amounts(amount):
    with pytest.raises(ValidationError):
        TransactionCreateRequest.model_validate(
            {
                "type": "credit",
                "amount": amount,
                "reference_id": "ref-1",
            }
        )


@pytest.mark.parametrize(
    ("type_value", "amount"),
    [
        ("credit", "1.00"),
        ("credit", "9999999999999999.99"),
        ("debit", "0.01"),
    ],
)
def test_transaction_create_accepts_valid_type_and_amount(type_value, amount):
    request = TransactionCreateRequest.model_validate(
        {"type": type_value, "amount": amount, "reference_id": "ref-1"}
    )

    assert request.type == type_value
    assert request.amount == amount


@pytest.mark.parametrize("transaction_type", ["", "TRANSFER", "refund", 1, None])
def test_transaction_create_rejects_invalid_types(transaction_type):
    with pytest.raises(ValidationError):
        TransactionCreateRequest.model_validate(
            {"type": transaction_type, "amount": "1.00", "reference_id": "ref-1"}
        )


@pytest.mark.parametrize("reference_id", ["", "   ", "x" * 201])
def test_transaction_create_rejects_blank_or_overlong_reference(reference_id):
    with pytest.raises(ValidationError):
        TransactionCreateRequest.model_validate(
            {"type": "credit", "amount": "1.00", "reference_id": reference_id}
        )


@pytest.mark.parametrize("description", ["x" * 501, 42])
def test_transaction_create_rejects_invalid_description(description):
    with pytest.raises(ValidationError):
        TransactionCreateRequest.model_validate(
            {
                "type": "credit",
                "amount": "1.00",
                "description": description,
                "reference_id": "ref-1",
            }
        )


@pytest.mark.parametrize("extra_field", ["account_id", "balance"])
def test_transaction_create_rejects_fields_outside_request_contract(extra_field):
    payload = {
        "type": "credit",
        "amount": "1.00",
        "reference_id": "ref-1",
        extra_field: "unexpected",
    }

    with pytest.raises(ValidationError):
        TransactionCreateRequest.model_validate(payload)
