-- Bootstrap schema snapshot. The Supabase migration is authoritative for deployment.

CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_name_not_blank CHECK (name ~ '[^[:space:]]'),
    CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)
);

CREATE UNIQUE INDEX idx_accounts_owner_id_id
    ON public.accounts (owner_id, id);
CREATE INDEX idx_accounts_owner_created_at
    ON public.accounts (owner_id, created_at DESC, id DESC);

CREATE TABLE public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    source_account_id UUID NOT NULL,
    destination_account_id UUID NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transfers_accounts_must_differ
        CHECK (source_account_id <> destination_account_id),
    CONSTRAINT transfers_source_account_owner_fk
        FOREIGN KEY (owner_id, source_account_id)
        REFERENCES public.accounts (owner_id, id) ON DELETE RESTRICT,
    CONSTRAINT transfers_destination_account_owner_fk
        FOREIGN KEY (owner_id, destination_account_id)
        REFERENCES public.accounts (owner_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_transfers_owner_created_at
    ON public.transfers (owner_id, created_at DESC, id DESC);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(500) NOT NULL DEFAULT '',
    reference_id VARCHAR(200) NOT NULL,
    transfer_id UUID REFERENCES public.transfers(id) ON DELETE RESTRICT,
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
CREATE UNIQUE INDEX idx_transactions_transfer_account
    ON public.transactions (transfer_id, account_id)
    WHERE transfer_id IS NOT NULL;

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
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transfers FORCE ROW LEVEL SECURITY;

CREATE ROLE ledger_app NOLOGIN NOBYPASSRLS;
GRANT ledger_app TO CURRENT_USER;

CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), ''),
        NULLIF(
            (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb)->>'sub',
            ''
        )
    )::UUID
$$;

CREATE POLICY accounts_tenant_access
    ON public.accounts
    FOR ALL
    TO PUBLIC
    USING (owner_id = public.request_user_id())
    WITH CHECK (owner_id = public.request_user_id());

CREATE POLICY transactions_tenant_access
    ON public.transactions
    FOR ALL
    TO PUBLIC
    USING (
        EXISTS (
            SELECT 1
            FROM public.accounts a
            WHERE a.id = transactions.account_id
              AND a.owner_id = public.request_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.accounts a
            WHERE a.id = transactions.account_id
              AND a.owner_id = public.request_user_id()
        )
    );

CREATE POLICY transfers_tenant_access
    ON public.transfers
    FOR ALL
    TO PUBLIC
    USING (owner_id = public.request_user_id())
    WITH CHECK (owner_id = public.request_user_id());

GRANT USAGE ON SCHEMA public TO ledger_app;
GRANT EXECUTE ON FUNCTION public.request_user_id() TO ledger_app;
GRANT SELECT, INSERT, UPDATE ON public.accounts TO ledger_app;
GRANT SELECT, INSERT ON public.transactions TO ledger_app;
GRANT SELECT, INSERT ON public.transfers TO ledger_app;
