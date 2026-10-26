CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_name_not_blank CHECK (name ~ '[^[:space:]]'),
    CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(500) NOT NULL DEFAULT '',
    reference_id VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transactions_reference_not_blank CHECK (reference_id ~ '[^[:space:]]'),
    CONSTRAINT transactions_reference_canonical CHECK (reference_id = lower(reference_id))
);

CREATE INDEX idx_accounts_created_at
    ON public.accounts (created_at DESC, id DESC);
CREATE INDEX idx_transactions_account_created_at
    ON public.transactions (account_id, created_at DESC, id DESC);
CREATE INDEX idx_transactions_created_at
    ON public.transactions (created_at DESC, id DESC);
CREATE UNIQUE INDEX idx_transactions_unique_reference_per_account
    ON public.transactions (account_id, lower(reference_id));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Transactions are immutable'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER transactions_are_immutable
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_transaction_mutation();

CREATE TRIGGER transactions_truncate_are_immutable
BEFORE TRUNCATE ON public.transactions
FOR EACH STATEMENT
EXECUTE FUNCTION public.prevent_transaction_mutation();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
