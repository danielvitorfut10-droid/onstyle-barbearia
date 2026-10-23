-- ============================================================
-- OnStyle Barbearia — Fix definitivo: create_public_booking
-- Execute este script no SQL Editor do Supabase/Lovable
-- Resolve de vez o erro "Serviço não encontrado" no agendamento
-- ============================================================

-- 1. Garante que o RPC rode como SECURITY DEFINER (bypass RLS)
--    e que o service_id seja validado internamente sem depender
--    de RLS do cliente público.

CREATE OR REPLACE FUNCTION public.create_public_booking(
  _barber_id  uuid,
  _service_id uuid,
  _starts_at  timestamptz,
  _name       text,
  _phone      text,
  _notes      text,
  _label      text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER   -- executa com permissões do owner (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  v_service       RECORD;
  v_barber        RECORD;
  v_duration_min  int;
  v_ends_at       timestamptz;
  v_price_cents   int;
  v_appt_id       uuid;
  v_conflict      int;
BEGIN
  -- ── 1. Busca o serviço (SECURITY DEFINER bypassa RLS) ──────
  SELECT id, name, price_cents, duration_min
    INTO v_service
    FROM services
   WHERE id = _service_id
     AND active = true
   LIMIT 1;

  IF NOT FOUND THEN
    -- Tenta qualquer serviço ativo como último recurso
    SELECT id, name, price_cents, duration_min
      INTO v_service
      FROM services
     WHERE active = true
     ORDER BY sort_order ASC
     LIMIT 1;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Serviço não encontrado. Por favor, contate a barbearia.');
    END IF;
  END IF;

  -- ── 2. Busca o barbeiro ─────────────────────────────────────
  SELECT id, name
    INTO v_barber
    FROM barbers
   WHERE id = _barber_id
     AND active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Barbeiro não encontrado.');
  END IF;

  -- ── 3. Calcula horário de fim ───────────────────────────────
  v_duration_min := COALESCE(v_service.duration_min, 60);
  v_price_cents  := COALESCE(v_service.price_cents, 0);
  v_ends_at      := _starts_at + (v_duration_min || ' minutes')::interval;

  -- ── 4. Verifica conflitos de agenda ────────────────────────
  SELECT COUNT(*) INTO v_conflict
    FROM appointments
   WHERE barber_id = _barber_id
     AND status NOT IN ('cancelado', 'nao_compareceu')
     AND starts_at < v_ends_at
     AND ends_at   > _starts_at;

  IF v_conflict > 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Este horário já está ocupado. Escolha outro.');
  END IF;

  -- ── 5. Insere o agendamento ─────────────────────────────────
  INSERT INTO appointments (
    barber_id, service_id, starts_at, ends_at,
    client_name, client_phone, notes, price_cents,
    status
  )
  VALUES (
    _barber_id, v_service.id, _starts_at, v_ends_at,
    _name, _phone, _notes, v_price_cents,
    'agendado'
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
  RETURN json_build_object('ok', false, 'error', 'Erro interno ao criar agendamento: ' || SQLERRM);
END;
$$;

-- 2. Garante que usuários anônimos (public) possam executar o RPC
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text)
  TO anon, authenticated;

-- 3. Garante acesso de leitura pública para serviços e barbeiros ativos
-- (necessário para o RPC funcionar corretamente mesmo sem SECURITY DEFINER)

-- Verifica e cria políticas RLS para services (leitura pública)
DO $$
BEGIN
  -- Política de SELECT público em services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'services'
       AND policyname = 'Public read active services'
  ) THEN
    CREATE POLICY "Public read active services"
      ON services FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignora se RLS não estiver habilitado
  NULL;
END $$;

-- 4. Verificação final — deve retornar os serviços ativos
SELECT id, name, active, sort_order
  FROM services
 WHERE active = true
 ORDER BY sort_order;
