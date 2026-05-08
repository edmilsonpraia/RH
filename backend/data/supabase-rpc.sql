-- =====================================================
-- Função RPC para execução de raw SQL (necessária para o backend Express)
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
    i int := 0;
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
    -- Substituir placeholders $1, $2, ... pelos argumentos (com escape correto)
    FOR arg IN SELECT value FROM jsonb_array_elements(COALESCE(args, '[]'::jsonb)) LOOP
        i := i + 1;
        placeholder := '\$' || i::text || '(?!\d)';

        IF jsonb_typeof(arg) = 'null' THEN
            replacement := 'NULL';
        ELSIF jsonb_typeof(arg) IN ('number', 'boolean') THEN
            replacement := arg::text;
        ELSE
            replacement := quote_literal(arg #>> '{}');
        END IF;

        final_q := regexp_replace(final_q, placeholder, replacement, 'g');
    END LOOP;

    is_select := final_q ~* '^\s*SELECT\b';
    is_insert := final_q ~* '^\s*INSERT\b';
    is_returning := final_q ~* '\bRETURNING\b';

    IF is_select THEN
        -- Embrulhar em jsonb_agg para devolver linhas
        EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), ''[]''::jsonb) FROM (' || final_q || ') t'
        INTO rows_result;
        RETURN jsonb_build_object('rows', rows_result, 'changes', 0, 'lastID', 0);

    ELSIF is_insert AND NOT is_returning THEN
        -- Auto-adicionar RETURNING id para obter lastID
        BEGIN
            EXECUTE final_q || ' RETURNING id' INTO last_id;
            GET DIAGNOSTICS changes = ROW_COUNT;
        EXCEPTION
            WHEN undefined_column OR feature_not_supported THEN
                -- Tabela sem coluna id (raro): executar sem RETURNING
                EXECUTE final_q;
                GET DIAGNOSTICS changes = ROW_COUNT;
                last_id := 0;
        END;
        RETURN jsonb_build_object('rows', '[]'::jsonb, 'changes', changes, 'lastID', last_id);

    ELSE
        -- UPDATE / DELETE / outros
        EXECUTE final_q;
        GET DIAGNOSTICS changes = ROW_COUNT;
        RETURN jsonb_build_object('rows', '[]'::jsonb, 'changes', changes, 'lastID', 0);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'app_sql error: % | query: %', SQLERRM, final_q;
END;
$$;

-- Restringir ao service_role (secret key) - publishable nao tem acesso
REVOKE ALL ON FUNCTION public.app_sql(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_sql(text, jsonb) TO service_role;

-- Confirmar instalacao
SELECT 'app_sql function instalada' AS status;
