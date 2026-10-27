-- ================================================================
-- OnStyle Barbearia — Mensalista: RPC com override de preço
-- Execute NO SQL Editor do Supabase/Lovable:
--   lovable.dev → seu projeto → Database → SQL Editor
-- ================================================================

-- Recria o RPC com parâmetro opcional de override de preço.
-- Quando _price_override >= 0 é passado, usa esse valor ao invés
-- do preço do serviço no banco — necessário para modo Mensalista (R$0,00).
-- É SECURITY DEFINER, então bypassa RLS completamente.

CREATE OR REPLACE FUNCTION public.create_public_booking(
  _barber_id      uuid,
  _service_id     uuid,
  _starts_at      timestamptz,
  _name           text,
  _phone          text,
  _notes          text,
  _label          text,            -- nome canônico passado pelo cliente
  _price_override int  DEFAULT -1  -- se >= 0, substitui o price_cents do serviço
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
  SELECT id, name, price_cents, duration_min, active
    INTO v_service
    FROM services
   WHERE id = _service_id
   LIMIT 1;

  IF NOT FOUND OR v_service.active = false THEN
    SELECT id, name, price_cents, duration_min, active
      INTO v_service
      FROM services
     WHERE lower(trim(name)) = lower(trim(_label))
       AND active = true
     ORDER BY sort_order ASC
     LIMIT 1;
  END IF;

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

  -- Usa override de preço quando fornecido (>= 0), senão preço do banco
  v_price_cents  := CASE
    WHEN _price_override >= 0 THEN _price_override
    ELSE COALESCE(v_service.price_cents, 0)
  END;

  v_ends_at := _starts_at + (v_duration_min || ' minutes')::interval;

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

-- Garante permissões para anon e authenticated
GRANT EXECUTE ON FUNCTION public.create_public_booking(
  uuid, uuid, timestamptz, text, text, text, text, int
) TO anon, authenticated;

-- Mantém compatibilidade com a assinatura antiga (7 argumentos)
-- sobrecarga automática via DEFAULT no 8º parâmetro — não precisa de nada extra.

-- Verificação
SELECT 'RPC atualizado com sucesso' AS status;
SELECT proname, pronargs, proargnames
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'create_public_booking';
