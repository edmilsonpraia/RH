-- =====================================================
-- Função RPC para execução de raw SQL (necessária para o backend Express)
-- v3: Corrigir deteção SELECT/INSERT/RETURNING.
--     Em PostgreSQL \b = backspace (NAO word boundary), usar \y.
--
-- Cole no SQL Editor do Supabase e execute (Run).
-- =====================================================

CREATE OR REPLACE FUNCTION public.app_sql(sql text, args jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    final_q text := sql;
    n_args int;
    i int;
    arg jsonb;
    rows_result jsonb;
    changes int := 0;
    last_id bigint := 0;
    is_select boolean;
    is_insert boolean;
    is_returning boolean;
    placeholder text;
    replacement text;
BEGIN
    n_args := jsonb_array_length(COALESCE(args, '[]'::jsonb));

    -- Substituir do MAIOR para o menor (evita $1 apanhar '1' de $10)
    FOR i IN REVERSE n_args..1 LOOP
        arg := args -> (i - 1);
        placeholder := '$' || i::text;

        IF arg IS NULL OR jsonb_typeof(arg) = 'null' THEN
            replacement := 'NULL';
        ELSIF jsonb_typeof(arg) IN ('number', 'boolean') THEN
            replacement := arg::text;
        ELSE
            replacement := quote_literal(arg #>> '{}');
        END IF;

        final_q := replace(final_q, placeholder, replacement);
    END LOOP;

    -- \y = word boundary em PostgreSQL (NAO \b que e backspace)
    is_select := final_q ~* '^\s*SELECT\y';
    is_insert := final_q ~* '^\s*INSERT\y';
    is_returning := final_q ~* '\yRETURNING\y';

    IF is_select THEN
        EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), ''[]''::jsonb) FROM (' || final_q || ') t'
        INTO rows_result;
        RETURN jsonb_build_object('rows', COALESCE(rows_result, '[]'::jsonb), 'changes', 0, 'lastID', 0);

    ELSIF is_insert AND NOT is_returning THEN
        BEGIN
            EXECUTE final_q || ' RETURNING id' INTO last_id;
            GET DIAGNOSTICS changes = ROW_COUNT;
        EXCEPTION
            WHEN undefined_column OR feature_not_supported THEN
                EXECUTE final_q;
                GET DIAGNOSTICS changes = ROW_COUNT;
                last_id := 0;
        END;
        RETURN jsonb_build_object('rows', '[]'::jsonb, 'changes', changes, 'lastID', last_id);

    ELSE
        EXECUTE final_q;
        GET DIAGNOSTICS changes = ROW_COUNT;
        RETURN jsonb_build_object('rows', '[]'::jsonb, 'changes', changes, 'lastID', 0);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'app_sql error: % | query: %', SQLERRM, final_q;
END;
$$;

REVOKE ALL ON FUNCTION public.app_sql(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_sql(text, jsonb) TO service_role;

-- Teste
SELECT app_sql('SELECT id, username, role FROM users WHERE username = $1', '["admin"]'::jsonb) AS teste;
