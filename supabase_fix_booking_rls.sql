-- ============================================================
-- OnStyle Barbearia — Fix RLS: permitir agendamentos públicos
-- Execute este script no SQL Editor do Supabase/Lovable
-- ============================================================

-- 1. Permite que usuários anônimos (clientes) INSIRAM agendamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'appointments'
       AND policyname = 'Public insert appointments'
  ) THEN
    CREATE POLICY "Public insert appointments"
      ON appointments FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Permite que usuários anônimos LEIAM serviços ativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'services'
       AND policyname = 'Public read services'
  ) THEN
    CREATE POLICY "Public read services"
      ON services FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 3. Permite que usuários anônimos LEIAM barbeiros ativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'barbers'
       AND policyname = 'Public read barbers'
  ) THEN
    CREATE POLICY "Public read barbers"
      ON barbers FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 4. Permite leitura pública de appointments (para checar conflito)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'appointments'
       AND policyname = 'Public read appointments for conflict check'
  ) THEN
    CREATE POLICY "Public read appointments for conflict check"
      ON appointments FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 5. Verificação: deve existir pelo menos 1 serviço ativo
SELECT id, name, active, sort_order FROM services WHERE active = true ORDER BY sort_order;
