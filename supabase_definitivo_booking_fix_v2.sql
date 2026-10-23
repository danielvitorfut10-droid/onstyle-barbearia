-- ==============================================================
-- OnStyle Barbearia — Migration definitiva para agendamento público (v2)
-- Execute no SQL Editor do painel da LOVABLE:
--   https://lovable.dev → seu projeto → Database → SQL Editor
-- NÃO execute no supabase.com/dashboard — é um banco separado!
-- ==============================================================

-- ── PRÉ-REQUISITO: Garante que UNIQUE (name) existe na tabela services ──────
-- Necessário para ON CONFLICT (name) funcionar sem duplicar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_name = 'services'
       AND constraint_type = 'UNIQUE'
       AND constraint_name LIKE '%name%'
  ) THEN
    -- Remove duplicatas de mesmo nome antes de criar a constraint (mantém o mais antigo)
    DELETE FROM public.services s
    WHERE s.id NOT IN (
      SELECT DISTINCT ON (name) id
        FROM public.services
       ORDER BY name, created_at ASC NULLS LAST
    );
    ALTER TABLE public.services ADD CONSTRAINT services_name_unique UNIQUE (name);
    RAISE NOTICE 'UNIQUE constraint criada em services(name)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint services(name) já existe — upsert seguro';
  END IF;
END $$;

-- PASSO 1: Upsert dos serviços canônicos (não remove existentes, só atualiza).
-- ON CONFLICT (name) agora é seguro porque a constraint existe.
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

-- PASSO 2: Habilita RLS e política de leitura pública de serviços ativos.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'services'
       AND policyname = 'Public read active services'
  ) THEN
    CREATE POLICY "Public read active services"
      ON public.services FOR SELECT
      TO anon, authenticated
      USING (active = true);
    RAISE NOTICE 'Política "Public read active services" criada';
  ELSE
    RAISE NOTICE 'Política "Public read active services" já existe';
  END IF;
END $$;

-- PASSO 3: Habilita RLS e política de leitura pública de barbeiros ativos.
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'barbers'
       AND policyname = 'Public read active barbers'
  ) THEN
    CREATE POLICY "Public read active barbers"
      ON public.barbers FOR SELECT
      TO anon, authenticated
      USING (active = true);
    RAISE NOTICE 'Política "Public read active barbers" criada';
  ELSE
    RAISE NOTICE 'Política "Public read active barbers" já existe';
  END IF;
END $$;

-- PASSO 4: Habilita RLS e política de INSERT público para agendamentos.
-- O site usa INSERT direto (não RPC). As validações de conflito, barbeiro e
-- serviço são feitas no servidor (public.functions.ts) antes do INSERT.
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments'
       AND policyname = 'Public insert appointments'
  ) THEN
    CREATE POLICY "Public insert appointments"
      ON public.appointments FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
    RAISE NOTICE 'Política "Public insert appointments" criada';
  ELSE
    RAISE NOTICE 'Política "Public insert appointments" já existe';
  END IF;
END $$;

-- PASSO 5: Política de SELECT público em appointments (verificação de conflito de horário).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments'
       AND policyname = 'Public read appointments conflict check'
  ) THEN
    CREATE POLICY "Public read appointments conflict check"
      ON public.appointments FOR SELECT
      TO anon, authenticated
      USING (true);
    RAISE NOTICE 'Política "Public read appointments conflict check" criada';
  ELSE
    RAISE NOTICE 'Política "Public read appointments conflict check" já existe';
  END IF;
END $$;

-- PASSO 6: Política de leitura pública de business_hours.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'business_hours'
       AND policyname = 'Public read business hours'
  ) THEN
    CREATE POLICY "Public read business hours"
      ON public.business_hours FOR SELECT
      TO anon, authenticated
      USING (true);
    RAISE NOTICE 'Política "Public read business hours" criada';
  ELSE
    RAISE NOTICE 'Política "Public read business hours" já existe';
  END IF;
END $$;

-- PASSO 7: Política de leitura pública de settings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'settings'
       AND policyname = 'Public read settings'
  ) THEN
    CREATE POLICY "Public read settings"
      ON public.settings FOR SELECT
      TO anon, authenticated
      USING (true);
    RAISE NOTICE 'Política "Public read settings" criada';
  ELSE
    RAISE NOTICE 'Política "Public read settings" já existe';
  END IF;
END $$;

-- ── VERIFICAÇÃO FINAL ────────────────────────────────────────────────────────
-- Deve mostrar 11 serviços ativos e as políticas criadas.

SELECT 'SERVIÇOS' as tipo, id, name, active, sort_order, price_cents
  FROM public.services
 WHERE active = true
 ORDER BY sort_order;

SELECT 'POLÍTICAS' as tipo, tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('services', 'appointments', 'barbers', 'business_hours', 'settings')
 ORDER BY tablename, cmd;

SELECT 'CONSTRAINTS' as tipo, constraint_name, constraint_type
  FROM information_schema.table_constraints
 WHERE table_name = 'services'
   AND constraint_type = 'UNIQUE';
