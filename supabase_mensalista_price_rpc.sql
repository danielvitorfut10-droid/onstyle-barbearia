-- ================================================================
-- OnStyle Barbearia — RPC para zerar preço de agendamento mensalista
-- Execute NO SQL Editor do Supabase/Lovable:
--   lovable.dev → seu projeto → Database → SQL Editor
-- ================================================================

-- Cria RPC com SECURITY DEFINER para atualizar price_cents de um agendamento.
-- SECURITY DEFINER = bypassa completamente a RLS.
-- Usado pelo app após criar agendamento mensalista para garantir price_cents = 0.
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

-- Permite que usuários públicos (anon) e autenticados chamem este RPC
GRANT EXECUTE ON FUNCTION public.set_appointment_price(uuid, int) TO anon, authenticated;

-- Verificação
SELECT 'RPC set_appointment_price criado com sucesso' AS status;
