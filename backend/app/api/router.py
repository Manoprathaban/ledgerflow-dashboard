from fastapi import APIRouter

from app.api.routes import accounts, transactions

router = APIRouter(prefix="/api/v1")

router.include_router(accounts.router)
router.include_router(transactions.router)
