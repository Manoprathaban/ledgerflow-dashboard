class LedgerError(Exception):
    """Base application exception for backend domain errors."""


class AccountNotFoundError(LedgerError):
    def __init__(self, account_id: object) -> None:
        self.account_id = account_id
        super().__init__(f"Account {account_id} was not found")


class DuplicateReferenceError(LedgerError):
    def __init__(self, reference_id: str) -> None:
        self.reference_id = reference_id
        super().__init__(f"Reference {reference_id} already exists for this account")


class InsufficientBalanceError(LedgerError):
    def __init__(self) -> None:
        super().__init__("The account has insufficient funds for this debit")


class BalanceLimitExceededError(LedgerError):
    def __init__(self) -> None:
        super().__init__("The resulting balance exceeds the supported limit")


class TransactionNotFoundError(LedgerError):
    def __init__(self, transaction_id: object) -> None:
        self.transaction_id = transaction_id
        super().__init__(f"Transaction {transaction_id} was not found")


class InvalidDateRangeError(LedgerError):
    def __init__(self) -> None:
        super().__init__("start_date must not be after end_date")


class InvalidAccountDataError(LedgerError):
    pass
