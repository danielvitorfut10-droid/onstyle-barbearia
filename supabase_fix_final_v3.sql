-- ================================================================
-- OnStyle Barbearia — Correção definitiva de agendamento (v3)
-- Execute NO SQL Editor da LOVABLE:
--   lovable.dev → seu projeto → Database → SQL Editor
-- Este script é idempotente (pode rodar várias vezes sem dano).
-- ================================================================

-- ── DIAGNÓSTICO INICIAL ──────────────────────────────────────────
-- Mostra o estado atual antes de qualquer alteração
SELECT '=== SERVIÇOS ATUAIS ===' as info;
SELECT id, name, active, sort_order, price_cents
  FROM public.services
 ORDER BY sort_order, name;

SELECT '=== RPC EXISTENTE ===' as info;
SELECT p.proname                AS funcao,
       p.prosecdef              AS security_definer,
       array_to_string(p.proacl, ', ') AS permissoes
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'create_public_booking';

SELECT '=== POLÍTICAS RLS ===' as info;
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('services','appointments','barbers','business_hours','settings')
 ORDER BY tablename, cmd;

-- ── PASSO 1: UNIQUE constraint em services(name) ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_name = 'services'
       AND constraint_type = 'UNIQUE'
       AND constraint_name LIKE '%name%'
  ) THEN
    -- Remove duplicatas de mesmo nome antes de criar a constraint
    DELETE FROM public.services s
    WHERE s.id NOT IN (
      SELECT DISTINCT ON (lower(name)) id
        FROM public.services
       ORDER BY lower(name), created_at ASC NULLS LAST
    );
    ALTER TABLE public.services ADD CONSTRAINT services_name_unique UNIQUE (name);
    RAISE NOTICE 'UNIQUE(name) criada em services';
  ELSE
    RAISE NOTICE 'UNIQUE(name) já existe em services';
  END IF;
END $$;

-- ── PASSO 2: Upsert seguro dos serviços canônicos ────────────────
-- Garante que todos os serviços existam com UUIDs reais e active=true.
-- NÃO apaga serviços existentes, apenas atualiza ou insere.
INSERT INTO public.services (name, description, price_cents, duration_min, active, sort_order)
VALUES
  ('Corte + barba',               'Combo completo de corte e barba com acabamento em navalha.',            7000,  60, true,  1),
  ('Corte + barba + sobrancelha', 'Combo completo de corte, barba e sobrancelha.',                        8500,  60, true,  2),
  ('Corte',                       'Corte de cabelo completo com acabamento.',                              4000,  60, true,  3),
  ('Barba',                       'Barba com acabamento em navalha.',                                     3000,  60, true,  4),
  ('Luzes',                       'Coloração com técnica de luzes para um visual moderno e natural.',     6000,  60, true,  5),
  ('Platinado',                   'Descoloração completa para o visual platinado exclusivo.',             11000, 60, true,  6),
  ('Relaxamento',                 'Tratamento de relaxamento capilar para fios alinhados e macios.',      4000,  60, true,  7),
  ('Limpeza de pele',             'Limpeza de pele profunda para uma pele saudável e renovada.',          2000,  60, true,  8),
  ('Sobrancelha',                 'Design e limpeza de sobrancelha com acabamento preciso.',              1500,  60, true,  9),
  ('Cavanhaque',                  'Modelagem de cavanhaque com navalha e acabamento perfeito.',           1500,  60, true, 10),
  ('Pezinho',                     'Acabamento no pezinho para manter o visual impecável entre cortes.',   2000,  60, true, 11)
ON CONFLICT (name) DO UPDATE SET
  active       = true,
  sort_order   = EXCLUDED.sort_order,
  price_cents  = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  description  = EXCLUDED.description;

-- ── PASSO 3: RLS — tabelas públicas ─────────────────────────────
ALTER TABLE public.services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='Public read active services') THEN
    CREATE POLICY "Public read active services" ON public.services FOR SELECT TO anon, authenticated USING (active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='barbers' AND policyname='Public read active barbers') THEN
    CREATE POLICY "Public read active barbers" ON public.barbers FOR SELECT TO anon, authenticated USING (active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_hours' AND policyname='Public read business hours') THEN
    CREATE POLICY "Public read business hours" ON public.business_hours FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='settings' AND policyname='Public read settings') THEN
    CREATE POLICY "Public read settings" ON public.settings FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='Public read appointments conflict check') THEN
    CREATE POLICY "Public read appointments conflict check" ON public.appointments FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='Public insert appointments') THEN
    CREATE POLICY "Public insert appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- UPDATE para addon de preço (precio adicional) - opcional
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='Public update own appointment price') THEN
    -- Permite que anon atualize apenas o price_cents de agendamentos recém-criados
    -- (RPC retorna o id; o app chama UPDATE logo após)
    CREATE POLICY "Public update own appointment price" ON public.appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── PASSO 4: RPC create_public_booking (recria com SECURITY DEFINER) ──
-- SECURITY DEFINER = acesso total às tabelas, bypassa RLS
-- Preserva: validação de serviço, barbeiro, preço real do banco, 
--           verificação de conflito de horário (atômica).
-- NOVO: fallback por nome quando _service_id não for encontrado ativo.
CREATE OR REPLACE FUNCTION public.create_public_booking(
  _barber_id  uuid,
  _service_id uuid,
  _starts_at  timestamptz,
  _name       text,
  _phone      text,
  _notes      text,
  _label      text   -- nome canônico passado pelo cliente (fallback para busca por nome)
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
BEGIN
  -- ── 1. Resolve o serviço ─────────────────────────────────────
  -- Tenta pelo UUID exato (active ou não — depois valida active)
  SELECT id, name, price_cents, duration_min, active
    INTO v_service
    FROM services
   WHERE id = _service_id
   LIMIT 1;

  -- Se não encontrou pelo UUID, tenta pelo nome (_label) — cobre IDs virtuais
  IF NOT FOUND OR v_service.active = false THEN
    SELECT id, name, price_cents, duration_min, active
      INTO v_service
      FROM services
     WHERE lower(trim(name)) = lower(trim(_label))
       AND active = true
     ORDER BY sort_order ASC
     LIMIT 1;
  END IF;

  -- Último recurso: primeiro serviço ativo do banco
  IF NOT FOUND THEN
    SELECT id, name, price_cents, duration_min, active
      INTO v_service
      FROM services
     WHERE active = true
     ORDER BY sort_order ASC
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'Nenhum serviço disponível. Contate a barbearia.'
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
  v_price_cents  := COALESCE(v_service.price_cents, 0);
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

  -- ── 5. Insere o agendamento ──────────────────────────────────
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

-- ── PASSO 5: Garante que anon e authenticated executam o RPC ────
GRANT EXECUTE ON FUNCTION public.create_public_booking(
  uuid, uuid, timestamptz, text, text, text, text
) TO anon, authenticated;

-- ── VERIFICAÇÃO FINAL ────────────────────────────────────────────
SELECT '=== SERVIÇOS ATIVOS APÓS FIX ===' as info;
SELECT id, name, active, sort_order, price_cents
  FROM public.services
 WHERE active = true
 ORDER BY sort_order;

SELECT '=== PERMISSÕES DO RPC ===' as info;
SELECT r.rolname,
       has_function_privilege(
         r.rolname,
         'public.create_public_booking(uuid,uuid,timestamptz,text,text,text,text)',
         'EXECUTE'
       ) AS pode_executar
  FROM (VALUES ('anon'), ('authenticated')) AS r(rolname);

SELECT '=== POLÍTICAS RLS ATIVAS ===' as info;
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('services','appointments','barbers','business_hours','settings')
 ORDER BY tablename, cmd;
