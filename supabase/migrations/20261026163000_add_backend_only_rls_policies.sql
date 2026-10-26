CREATE POLICY accounts_backend_access
    ON public.accounts
    FOR ALL
    TO PUBLIC
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));

CREATE POLICY accounts_backend_only
    ON public.accounts
    AS RESTRICTIVE
    FOR ALL
    TO PUBLIC
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));

CREATE POLICY transactions_backend_access
    ON public.transactions
    FOR ALL
    TO PUBLIC
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));

CREATE POLICY transactions_backend_only
    ON public.transactions
    AS RESTRICTIVE
    FOR ALL
    TO PUBLIC
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
