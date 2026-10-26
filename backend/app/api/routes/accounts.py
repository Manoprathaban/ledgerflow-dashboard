from fastapi import APIRouter

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("")
async def list_accounts():
    """List accounts.

    This is a placeholder route for the foundation stage. Detailed query logic and
    response schemas will be implemented in the next step.
    """
    return {"items": [], "count": 0}


@router.get("/{account_id}")
async def get_account(account_id: str):
    """Fetch a single account."""
    return {"account_id": account_id}


@router.get("/{account_id}/balance")
async def get_account_balance(account_id: str):
    """Fetch the current account balance."""
    return {"account_id": account_id, "balance": "0.00"}


@router.get("/{account_id}/transactions")
async def get_account_transactions(account_id: str):
    """Fetch transaction history for a single account."""
    return {"account_id": account_id, "items": [], "count": 0}


@router.post("/{account_id}/transactions")
async def create_account_transaction(account_id: str):
    """Create a transaction for a single account.

    Placeholder only; actual balance validation and repository-backed SQL will be
    implemented in the next step.
    """
    return {"account_id": account_id, "message": "Not implemented yet"}


@router.post("")
async def create_account():
    """Create an account.

    This endpoint will be implemented with validation and repository-backed SQL
    once the schema and contract are finalized.
    """
    return {"message": "Not implemented yet"}
