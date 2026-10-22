-- ============================================================
-- OnStyle Barbearia — Migração: Gabriel e Romario
-- Execute este script no SQL Editor do Lovable/Supabase
-- ============================================================

-- 1. Desativar barbeiros antigos (Rian e Lemuel)
UPDATE barbers SET active = false
WHERE name ILIKE '%rian%' OR name ILIKE '%lemuel%' OR name ILIKE '%lemoel%';

-- 2. Inserir barbeiro Gabriel (se não existir)
INSERT INTO barbers (name, nickname, bio, active, sort_order)
SELECT
  'Gabriel',
  'Gabriel',
  'Especialista em cortes modernos, degradês, acabamento em navalha, barba desenhada e cortes infantis.',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE name ILIKE '%gabriel%' AND active = true);

-- 3. Inserir barbeiro Romário (se não existir)
INSERT INTO barbers (name, nickname, bio, active, sort_order)
SELECT
  'Romario',
  'Romario',
  'Especialista em cortes modernos, tradicionais, degradês, acabamento em navalha, barba desenhada e desenho.',
  true,
  2
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE (name ILIKE '%romario%' OR name ILIKE '%romário%') AND active = true);

-- 4. Desativar todos os serviços atuais para recriar
UPDATE services SET active = false;

-- 5. Inserir/atualizar serviços canônicos
-- Corte + barba (primeira opção)
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Corte + barba', 'Combo completo de corte e barba com acabamento em navalha.', 7000, 60, true, 1)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Corte + barba + sobrancelha
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Corte + barba + sobrancelha', 'Combo completo de corte, barba e sobrancelha.', 8500, 60, true, 2)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Corte
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Corte', 'Corte de cabelo completo com acabamento.', 4000, 60, true, 3)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Barba
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Barba', 'Barba com acabamento em navalha.', 3000, 60, true, 4)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Luzes
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Luzes', 'Coloração com técnica de luzes para um visual moderno e natural.', 6000, 60, true, 5)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Platinado
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Platinado', 'Descoloração completa para o visual platinado exclusivo.', 11000, 60, true, 6)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Relaxamento
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Relaxamento', 'Tratamento de relaxamento capilar para fios alinhados e macios.', 4000, 60, true, 7)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Limpeza de pele
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Limpeza de pele', 'Limpeza de pele profunda para uma pele saudável e renovada.', 2000, 60, true, 8)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Sobrancelha (vitrine)
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Sobrancelha', 'Design e limpeza de sobrancelha com acabamento preciso.', 1500, 60, true, 9)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Cavanhaque (vitrine)
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Cavanhaque', 'Modelagem de cavanhaque com navalha e acabamento perfeito.', 1500, 60, true, 10)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- Pezinho (vitrine)
INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES ('Pezinho', 'Acabamento no pezinho para manter o visual impecável entre cortes.', 2000, 60, true, 11)
ON CONFLICT (name) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  active = true,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;

-- ============================================================
-- 6. Criar usuários de login para Gabriel e Romario
--    Execute DEPOIS de inserir os barbeiros acima.
--    Substitua os IDs reais dos barbeiros abaixo se necessário.
-- ============================================================

-- Ver IDs dos barbeiros inseridos:
-- SELECT id, name FROM barbers WHERE active = true ORDER BY sort_order;

-- Criar usuário Gabriel via Supabase Auth (necessita ser feito pelo dashboard)
-- Email: carmo.gabriel01@gmail.com  |  Senha: gabriel1234

-- Criar usuário Romario via Supabase Auth (necessita ser feito pelo dashboard)
-- Email: romariodos530@gmail.com  |  Senha: romario1234

-- Após criar os usuários pelo dashboard, execute o seguinte para associar roles:
-- (substitua 'ID_DO_USUARIO_GABRIEL' e 'ID_DO_USUARIO_ROMARIO' pelos UUIDs reais)
--
-- INSERT INTO user_roles (user_id, role)
-- VALUES
--   ('ID_DO_USUARIO_GABRIEL', 'barber'),
--   ('ID_DO_USUARIO_ROMARIO', 'barber')
-- ON CONFLICT DO NOTHING;
--
-- UPDATE barbers SET user_id = 'ID_DO_USUARIO_GABRIEL'
-- WHERE name ILIKE '%gabriel%' AND active = true;
--
-- UPDATE barbers SET user_id = 'ID_DO_USUARIO_ROMARIO'
-- WHERE (name ILIKE '%romario%' OR name ILIKE '%romário%') AND active = true;
