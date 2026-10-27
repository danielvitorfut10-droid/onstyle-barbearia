-- ================================================================
-- OnStyle — Fix v3: Serviço correto + Mensalista zero + Sem fallback silencioso
-- Execute NO SQL Editor da LOVABLE (não no supabase.com/dashboard).
-- Idempotente: pode rodar várias vezes sem dano.
-- NÃO executa o antigo supabase_mensalista_FINAL.sql.
-- ================================================================

-- ── DIAGNÓSTICO ANTES DA CORREÇÃO ────────────────────────────────
SELECT '=== SERVIÇOS ATIVOS ===' AS info;
SELECT id, name, active, sort_order, price_cents
  FROM public.services
 WHERE active = true
 ORDER BY sort_order;

SELECT '=== RPC ATUAL ===' AS info;
SELECT p.proname         AS funcao,
       p.prosecdef       AS security_definer,
       array_to_string(p.proacl, ', ') AS permissoes
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('create_public_booking', 'set_appointment_price');

-- ── PASSO 1: Recria create_public_booking SEM fallback silencioso ─
-- MUDANÇAS EM RELAÇÃO À VERSÃO ANTERIOR:
--   • Quando _notes contém '[MENSALISTA', grava price_cents = 0.
--   • NÃO há mais fallback para "primeiro serviço ativo" — se o UUID
--     não for encontrado E o _label não casar, retorna erro claro.
--   • O último recurso foi removido para evitar substituição silenciosa.
--   • Preserva notes e demais campos — sem UPDATE posterior necessário.
CREATE OR REPLACE FUNCTION public.create_public_booking(
  _barber_id  uuid,
  _service_id uuid,
  _starts_at  timestamptz,
  _name       text,
  _phone      text,
  _notes      text,
  _label      text   -- nome canônico passado pelo app (fallback por nome)
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service      RECORD;
  v_barber       RECORD;
  v_duration_min int;
  v_ends_at      timestamptz;
  v_price_cents  int;
  v_appt_id      uuid;
  v_conflict     int;
  v_is_mensalista boolean;
  NULL_UUID      CONSTANT uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- ── 1. Resolve o serviço ─────────────────────────────────────
  -- Tenta pelo UUID exato (qualquer status — valida active depois)
  IF _service_id <> NULL_UUID THEN
    SELECT id, name, price_cents, duration_min, active
      INTO v_service
      FROM services
     WHERE id = _service_id
     LIMIT 1;
  END IF;

  -- Se não encontrou pelo UUID OU serviço inativo, tenta pelo nome (_label)
  -- Isso cobre: IDs virtuais, serviço recém-criado sem RLS, etc.
  IF NOT FOUND OR v_service.active = false THEN
    SELECT id, name, price_cents, duration_min, active
      INTO v_service
      FROM services
     WHERE lower(trim(name)) = lower(trim(_label))
       AND active = true
     ORDER BY sort_order ASC
     LIMIT 1;
  END IF;

  -- NÃO há mais fallback para primeiro serviço ativo.
  -- Se chegou aqui sem serviço, retorna erro explícito para o app tratar.
  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok',    false,
      'error', format(
        'Serviço não encontrado (id=%s, label="%s"). Recarregue a página e tente novamente.',
        _service_id, _label
      )
    );
  END IF;

  -- ── 2. Valida o barbeiro ─────────────────────────────────────
  SELECT id, name
    INTO v_barber
    FROM barbers
   WHERE id = _barber_id
     AND active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Barbeiro não encontrado.');
  END IF;

  -- ── 3. Calcula horário de fim ────────────────────────────────
  v_duration_min := COALESCE(v_service.duration_min, 60);
  v_ends_at      := _starts_at + (v_duration_min || ' minutes')::interval;

  -- ── 4. Verifica conflito de agenda (atômico) ─────────────────
  SELECT COUNT(*)::int INTO v_conflict
    FROM appointments
   WHERE barber_id = _barber_id
     AND status NOT IN ('cancelado', 'nao_compareceu')
     AND starts_at < v_ends_at
     AND ends_at   > _starts_at;

  IF v_conflict > 0 THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'Este horário já está ocupado. Escolha outro.'
    );
  END IF;

  -- ── 5. Calcula price_cents ───────────────────────────────────
  -- Se _notes contém '[MENSALISTA', grava 0.
  -- Preserva o check em texto simples (não regex) para evitar overhead.
  v_is_mensalista := position('[MENSALISTA' IN upper(_notes)) > 0;
  v_price_cents   := CASE WHEN v_is_mensalista THEN 0
                          ELSE COALESCE(v_service.price_cents, 0)
                     END;

  -- ── 6. Insere o agendamento ──────────────────────────────────
  INSERT INTO appointments (
    barber_id, service_id, starts_at, ends_at,
    client_name, client_phone, notes, price_cents, status
  ) VALUES (
    _barber_id, v_service.id, _starts_at, v_ends_at,
    _name, _phone, _notes, v_price_cents, 'agendado'
  )
  RETURNING id INTO v_appt_id;

  RETURN json_build_object(
    'ok',          true,
    'id',          v_appt_id,
    'barberName',  v_barber.name,
    'serviceName', v_service.name,
    'priceCents',  v_price_cents
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'ok', false,
    'error', 'Erro interno ao criar agendamento: ' || SQLERRM
  );
END;
$$;

-- ── PASSO 2: Garante que set_appointment_price existe (para addons) ─
-- Usada SOMENTE para adicionar preço de addon (não para mensalista).
-- SECURITY DEFINER para bypassar RLS.
CREATE OR REPLACE FUNCTION public.set_appointment_price(
  _appointment_id uuid,
  _price_cents    int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments
     SET price_cents = _price_cents
   WHERE id = _appointment_id;
END;
$$;

-- ── PASSO 3: Permissões ──────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.create_public_booking(
  uuid, uuid, timestamptz, text, text, text, text
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_appointment_price(uuid, int)
  TO anon, authenticated;

-- ── PASSO 4: Garante que a política UPDATE existe (para set_appointment_price fallback) ─
-- USANDO ONLY authenticated para não expor UPDATE público a anon.
-- O anon pode chamar set_appointment_price via RPC (SECURITY DEFINER) sem precisar de UPDATE direto.
DO $$ BEGIN
  -- Remove política antiga com USING (true) se existir (de scripts anteriores)
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments'
       AND policyname IN (
         'Public update own appointment price',
         'Public update appointment price'
       )
  ) THEN
    DROP POLICY IF EXISTS "Public update own appointment price" ON public.appointments;
    DROP POLICY IF EXISTS "Public update appointment price" ON public.appointments;
    RAISE NOTICE 'Políticas UPDATE anteriores removidas (set_appointment_price usa SECURITY DEFINER)';
  END IF;
END $$;

-- ── VERIFICAÇÃO FINAL ─────────────────────────────────────────────
SELECT '=== SERVIÇOS ATIVOS APÓS FIX ===' AS info;
SELECT id, name, active, sort_order, price_cents
  FROM public.services
 WHERE active = true
 ORDER BY sort_order;

SELECT '=== PERMISSÕES DO RPC ===' AS info;
SELECT r.rolname,
       has_function_privilege(
         r.rolname,
         'public.create_public_booking(uuid,uuid,timestamptz,text,text,text,text)',
         'EXECUTE'
       ) AS pode_executar_booking,
       has_function_privilege(
         r.rolname,
         'public.set_appointment_price(uuid,int)',
         'EXECUTE'
       ) AS pode_executar_price
  FROM (VALUES ('anon'), ('authenticated')) AS r(rolname);

SELECT '=== POLÍTICAS RLS APPOINTMENTS ===' AS info;
SELECT policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'appointments'
 ORDER BY cmd, policyname;
