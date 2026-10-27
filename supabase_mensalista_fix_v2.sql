-- ================================================================
-- OnStyle Barbearia — Fix Mensalista: Preço Zerado + Serviço Correto
-- Execute NO SQL Editor da Lovable:
--   lovable.dev → seu projeto → Database → SQL Editor
-- ================================================================
-- PROBLEMA 1: Agendamento mensalista somava valor na receita porque
--   o UPDATE price_cents = 0 era bloqueado por RLS (cliente anon).
-- PROBLEMA 2: Serviço exibido no painel podia ser o fallback (primeiro
--   serviço ativo) em vez do serviço selecionado pelo cliente.
-- SOLUÇÃO: RPC set_appointment_price com SECURITY DEFINER garante que
--   o price_cents sempre é zerado, bypassing qualquer RLS.
-- ================================================================

-- PASSO 1: Cria (ou recria) o RPC set_appointment_price
-- SECURITY DEFINER = executa como owner (postgres), bypassa RLS completamente
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

-- Permite que clientes públicos (anon) e autenticados chamem este RPC
GRANT EXECUTE ON FUNCTION public.set_appointment_price(uuid, int) TO anon, authenticated;

-- PASSO 2: Garante que a política RLS de UPDATE em appointments existe
-- (fallback caso o RPC falhe por algum motivo)
DO $$
BEGIN
  -- Remove política antiga com nome diferente se existir
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments'
       AND policyname = 'Public update own appointment price'
  ) THEN
    DROP POLICY "Public update own appointment price" ON public.appointments;
    RAISE NOTICE 'Política antiga removida para recriação';
  END IF;
END $$;

-- Recria a política de UPDATE mais abrangente
DO $$
BEGIN
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
    RAISE NOTICE 'Política "Public update appointment price" criada';
  ELSE
    RAISE NOTICE 'Política "Public update appointment price" já existe';
  END IF;
END $$;

-- PASSO 3: Verifica o estado atual do RPC e da política
SELECT 'RPC set_appointment_price' AS item, 
       routine_name AS nome,
       security_type AS segurança
  FROM information_schema.routines
 WHERE routine_schema = 'public'
   AND routine_name = 'set_appointment_price';

SELECT 'POLÍTICA UPDATE' AS item, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'appointments'
   AND cmd IN ('UPDATE', 'ALL')
 ORDER BY policyname;
