class LedgerError(Exception):
    """Base application exception for backend domain errors."""


class AccountNotFoundError(LedgerError):
    pass


class DuplicateReferenceError(LedgerError):
    pass


class InsufficientBalanceError(LedgerError):
    pass


class InvalidAccountDataError(LedgerError):
    pass
