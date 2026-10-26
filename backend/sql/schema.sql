CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL DEFAULT '',
    reference_id VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transactions_reference_not_blank CHECK (length(trim(reference_id)) > 0),
    CONSTRAINT transactions_unique_reference_per_account UNIQUE (account_id, reference_id)
);

CREATE INDEX idx_accounts_name ON accounts (name);
CREATE INDEX idx_transactions_account_created_at ON transactions (account_id, created_at DESC);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX idx_transactions_reference_id ON transactions (reference_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
