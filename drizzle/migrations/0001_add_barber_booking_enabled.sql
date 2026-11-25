ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  _barber_id uuid,
  _service_id uuid,
  _starts_at timestamp with time zone,
  _name text,
  _phone text,
  _notes text,
  _label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s record; b record; extra record; _ends timestamptz; _id uuid;
  _price int; _extra_id uuid; _extra_tag text[]; _service_name text;
  _mensalista boolean;
BEGIN
  _name := btrim(coalesce(_name,'')); _phone := btrim(coalesce(_phone,''));
  _notes := nullif(btrim(coalesce(_notes,'')),'');
  IF length(_name) < 2 OR length(_name) > 80 OR length(_phone) < 10 OR length(_phone) > 20
     OR (_notes IS NOT NULL AND length(_notes) > 280) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dados inválidos.');
  END IF;
  SELECT id, name, price_cents, duration_min, active INTO s FROM public.services WHERE id = _service_id;
  SELECT id, name, active, booking_enabled INTO b FROM public.barbers WHERE id = _barber_id FOR UPDATE;
  IF s.id IS NULL OR b.id IS NULL OR s.active IS NOT TRUE OR b.active IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Serviço ou barbeiro indisponível.');
  END IF;
  IF b.booking_enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este barbeiro não está aceitando agendamentos no momento.');
  END IF;
  IF _starts_at IS NULL OR _starts_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Escolha um horário futuro.');
  END IF;
  IF s.duration_min IS NULL OR s.duration_min <= 0 OR s.price_cents IS NULL OR s.price_cents < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Configuração inválida do serviço. Contate a barbearia.');
  END IF;
  _mensalista := coalesce(_notes, '') ~* '\[MENSALISTA(\]|[[:space:]])';
  _price := s.price_cents;
  _service_name := s.name;
  _extra_tag := regexp_match(coalesce(_notes, ''), '\[ADICIONAL_ID:([0-9a-fA-F-]{36})\]');
  IF position('[ADICIONAL_ID:' IN coalesce(_notes, '')) > 0 AND _extra_tag IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Serviço adicional inválido.');
  END IF;
  IF _extra_tag IS NOT NULL THEN
    BEGIN
      _extra_id := _extra_tag[1]::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Serviço adicional inválido.');
    END;
    SELECT id, name, price_cents, active INTO extra
      FROM public.services WHERE id = _extra_id;
    IF extra.id IS NULL OR extra.active IS NOT TRUE OR extra.id = s.id
       OR extra.price_cents IS NULL OR extra.price_cents < 0
       OR lower(btrim(extra.name)) NOT IN ('relaxamento', 'limpeza de pele') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Serviço adicional indisponível.');
    END IF;
    _price := _price + extra.price_cents;
    _service_name := s.name || ' + ' || extra.name;
    _notes := regexp_replace(_notes, '\[ADICIONAL_ID:[^\]]*\]', '', 'g');
    _notes := '[Serviço adicional: ' || extra.name || ']' || E'\n' || btrim(_notes);
  END IF;
  IF _mensalista THEN
    _price := 0;
    _notes := '[MENSALISTA]' || E'\n' || btrim(regexp_replace(
      _notes, '\[MENSALISTA[^\]]*\]', '', 'gi'));
  END IF;
  _ends := _starts_at + make_interval(mins => s.duration_min);
  -- Bloqueia apenas o horário exato já agendado (mesmo início)
  IF EXISTS (SELECT 1 FROM public.appointments WHERE barber_id = b.id AND status <> 'cancelado'
             AND starts_at = _starts_at) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esse horário acabou de ser reservado por outro cliente. Por favor, escolha outro horário disponível.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_slots WHERE barber_id = b.id AND reason IS DISTINCT FROM 'desbloqueado'
             AND starts_at < _ends AND ends_at > _starts_at) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esse horário está indisponível ou foi bloqueado pelo barbeiro. Escolha outro horário.');
  END IF;
  INSERT INTO public.appointments (barber_id, service_id, client_name, client_phone, starts_at, ends_at, price_cents, notes)
  VALUES (b.id, s.id, _name, _phone, _starts_at, _ends, _price, _notes) RETURNING id INTO _id;
  INSERT INTO public.notifications (barber_id, type, title, body)
  VALUES (b.id, 'novo_agendamento', 'Novo agendamento', _name || ' • ' || _service_name || ' • ' || left(coalesce(_label,''), 40));
  RETURN jsonb_build_object('ok', true, 'id', _id, 'barberName', b.name, 'serviceName', _service_name, 'priceCents', _price);
END;
$function$;