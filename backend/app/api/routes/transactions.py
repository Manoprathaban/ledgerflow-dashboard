from fastapi import APIRouter

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
async def list_transactions():
    """List transactions.

    Placeholder route for the foundation stage. Full filtering, sorting, and
    pagination rules will be implemented once the contracts and schema are defined.
    """
    return {"items": [], "count": 0}


@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str):
    """Fetch a single transaction."""
    return {"transaction_id": transaction_id}


@router.post("")
async def create_transaction():
    """Create a transaction on an account.

    Actual validation and balance workflow are not implemented in this foundation
    step.
    """
    return {"message": "Not implemented yet"}
