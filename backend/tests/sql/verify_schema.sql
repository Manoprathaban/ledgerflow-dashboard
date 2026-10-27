BEGIN;

INSERT INTO public.accounts (id, name, balance)
VALUES ('10000000-0000-4000-8000-000000000001', 'CI ledger account', 100.00);

INSERT INTO public.transactions
    (id, account_id, type, amount, description, reference_id)
VALUES
    ('20000000-0000-4000-8000-000000000001',
     '10000000-0000-4000-8000-000000000001',
     'debit', 25.00, 'migration smoke test', 'ci-reference');

DO $$
BEGIN
    BEGIN
        INSERT INTO public.transactions
            (account_id, type, amount, description, reference_id)
        VALUES
            ('10000000-0000-4000-8000-000000000001',
             'credit', 1.00, 'duplicate check', 'ci-reference');
        RAISE EXCEPTION 'Expected case-insensitive duplicate reference rejection';
    EXCEPTION WHEN unique_violation THEN
        NULL;
    END;

    BEGIN
        UPDATE public.transactions
        SET description = 'mutation should fail'
        WHERE id = '20000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'Expected immutable transaction update rejection';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        NULL;
    END;

    BEGIN
        DELETE FROM public.transactions
        WHERE id = '20000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'Expected immutable transaction delete rejection';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        NULL;
    END;

    BEGIN
        TRUNCATE public.transactions;
        RAISE EXCEPTION 'Expected immutable transaction truncate rejection';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        NULL;
    END;

    BEGIN
        INSERT INTO public.accounts (name, balance)
        VALUES ('Invalid negative balance', -1.00);
        RAISE EXCEPTION 'Expected non-negative balance check rejection';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    IF (
        SELECT COUNT(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('accounts', 'transactions', 'transfers')
          AND policyname IN (
              'accounts_tenant_access',
              'transactions_tenant_access',
              'transfers_tenant_access'
          )
    ) != 3 THEN
        RAISE EXCEPTION 'Expected tenant RLS policies on ledger tables';
    END IF;
END;
$$;

INSERT INTO auth.users (id)
VALUES
    ('30000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000002');

UPDATE public.accounts
SET owner_id = '30000000-0000-4000-8000-000000000001'
WHERE id = '10000000-0000-4000-8000-000000000001';

INSERT INTO public.accounts (id, owner_id, name)
VALUES
    ('10000000-0000-4000-8000-000000000002',
     '30000000-0000-4000-8000-000000000002',
     'Another tenant account');

DO $$
BEGIN
    BEGIN
        INSERT INTO public.transfers
            (owner_id, source_account_id, destination_account_id, amount)
        VALUES
            ('30000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002',
             1.00);
        RAISE EXCEPTION 'Expected cross-tenant transfer rejection';
    EXCEPTION WHEN foreign_key_violation THEN
        NULL;
    END;
END;
$$;

SET LOCAL ROLE ledger_app;
SELECT set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.accounts) != 1 THEN
        RAISE EXCEPTION 'Tenant RLS exposed another owner account';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.transactions
        WHERE id = '20000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'Tenant RLS hid an account transaction from its owner';
    END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
