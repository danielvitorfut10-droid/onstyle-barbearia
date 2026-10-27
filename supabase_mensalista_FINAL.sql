-- ================================================================
-- OnStyle Barbearia — MENSALISTA FIX FINAL (versão consolidada)
-- Execute TODO este bloco no SQL Editor do Supabase/Lovable:
--   lovable.dev → seu projeto → Database → SQL Editor → New query
-- ================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. RPC set_appointment_price (SECURITY DEFINER)
--    Zereia o price_cents para agendamentos mensalistas,
--    bypassando qualquer política RLS.
-- ──────────────────────────────────────────────────────────────────
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

-- Permite que clientes públicos (anon) chamem este RPC
GRANT EXECUTE ON FUNCTION public.set_appointment_price(uuid, int) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────
-- 2. Política RLS permissiva de UPDATE em appointments
--    (fallback caso o RPC acima falhe)
-- ──────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Remove versão antiga com nome diferente, se existir
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments'
       AND policyname = 'Public update own appointment price'
  ) THEN
    DROP POLICY "Public update own appointment price" ON public.appointments;
  END IF;

  -- Cria política de UPDATE se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments'
       AND policyname = 'Public update appointment price'
  ) THEN
    CREATE POLICY "Public update appointment price"
      ON public.appointments FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE 'Política "Public update appointment price" criada com sucesso.';
  ELSE
    RAISE NOTICE 'Política "Public update appointment price" já existia — mantida.';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- 3. VERIFICAÇÃO — confere se tudo foi criado corretamente
-- ──────────────────────────────────────────────────────────────────
SELECT
  '✅ RPC set_appointment_price' AS item,
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'set_appointment_price';

SELECT
  '✅ Política UPDATE appointments' AS item,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'appointments'
  AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;
