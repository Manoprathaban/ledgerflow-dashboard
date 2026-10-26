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
END;
$$;

ROLLBACK;
