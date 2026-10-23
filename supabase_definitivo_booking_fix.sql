-- ==============================================================
-- OnStyle Barbearia — Migration definitiva para agendamento público
-- Execute este script no SQL Editor do painel do LOVABLE
-- (https://lovable.dev → seu projeto → Database → SQL Editor)
-- NÃO execute no supabase.com/dashboard — é um banco diferente!
-- ==============================================================

-- PASSO 1: Garante que todos os serviços canônicos existam com UUIDs reais.
-- Usa ON CONFLICT (name) = upsert seguro (não apaga dados existentes).
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

-- PASSO 2: Garante que a tabela services tem RLS habilitada e política de leitura pública.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Política de leitura pública de serviços ativos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'services'
       AND policyname = 'Public read active services'
  ) THEN
    CREATE POLICY "Public read active services"
      ON public.services FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PASSO 3: Garante que anon pode ler barbeiros ativos.
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
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PASSO 4: Garante que anon pode INSERIR agendamentos (clientes públicos).
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
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PASSO 5: Garante que anon pode LER agendamentos (para checar conflito de horário).
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
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PASSO 6: Garante que anon pode LER business_hours.
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
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PASSO 7: Garante que anon pode LER settings.
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
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- VERIFICAÇÃO FINAL — Deve mostrar os serviços ativos e as políticas criadas
SELECT 'SERVIÇOS' as tipo, id, name, active, sort_order
  FROM public.services
 WHERE active = true
 ORDER BY sort_order;

SELECT 'POLÍTICAS' as tipo, tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('services', 'appointments', 'barbers', 'business_hours', 'settings')
 ORDER BY tablename, cmd;
