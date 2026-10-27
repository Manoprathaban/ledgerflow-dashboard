CREATE ROLE ledger_app NOLOGIN NOBYPASSRLS;

GRANT ledger_app TO CURRENT_USER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        GRANT ledger_app TO postgres;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ledger_app TO service_role;
    END IF;
END;
$$;

ALTER TABLE public.accounts
    ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

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

ALTER TABLE public.transactions
    ADD COLUMN transfer_id UUID REFERENCES public.transfers(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX idx_transactions_transfer_account
    ON public.transactions (transfer_id, account_id)
    WHERE transfer_id IS NOT NULL;

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

DROP POLICY accounts_backend_access ON public.accounts;
DROP POLICY accounts_backend_only ON public.accounts;
DROP POLICY transactions_backend_access ON public.transactions;
DROP POLICY transactions_backend_only ON public.transactions;

ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers FORCE ROW LEVEL SECURITY;

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
