-- ============================================================
-- OnStyle Barbearia — SQL mínimo para o agendamento funcionar
-- Execute APENAS este script no SQL Editor da Lovable:
--   lovable.dev → seu projeto → Database → SQL Editor
--
-- Este script NÃO recria o banco, NÃO apaga serviços,
-- NÃO altera preços e NÃO duplica nada.
-- Garante apenas que o RPC create_public_booking pode ser
-- chamado por clientes públicos (role anon).
-- ============================================================

-- ── VERIFICAÇÃO PRÉVIA ─────────────────────────────────────────────────────
-- Execute esta parte primeiro para ver o que já existe no banco:
SELECT
  p.proname                                              AS funcao,
  pg_catalog.pg_get_function_arguments(p.oid)           AS argumentos,
  p.prosecdef                                            AS security_definer,
  array_to_string(p.proacl, ', ')                        AS permissoes_acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_public_booking';

-- ── CORREÇÃO ───────────────────────────────────────────────────────────────
-- Garante que anon e authenticated podem executar o RPC.
-- Se a função não existir, este GRANT vai falhar com mensagem clara.
GRANT EXECUTE ON FUNCTION public.create_public_booking(
  uuid, uuid, timestamptz, text, text, text, text
) TO anon, authenticated;

-- ── VERIFICAÇÃO FINAL ──────────────────────────────────────────────────────
-- Confirma que os serviços estão no banco e que o RPC tem as permissões.
SELECT name, active, price_cents, sort_order
  FROM public.services
 ORDER BY sort_order;

SELECT
  r.rolname,
  has_function_privilege(r.rolname, 'public.create_public_booking(uuid,uuid,timestamptz,text,text,text,text)', 'EXECUTE') AS pode_executar
FROM (VALUES ('anon'), ('authenticated')) AS r(rolname);
