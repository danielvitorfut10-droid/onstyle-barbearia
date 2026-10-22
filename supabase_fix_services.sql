-- ============================================================
-- OnStyle Barbearia — Fix: Garantir serviços canônicos no banco
-- Execute este script no SQL Editor do Lovable/Supabase
-- Isto resolve o erro "Serviço não encontrado" definitivamente.
-- ============================================================

-- Garante que todos os serviços canônicos existam com IDs UUID reais.
-- Usa ON CONFLICT (name) para upsert seguro.

INSERT INTO services (name, description, price_cents, duration_min, active, sort_order)
VALUES
  ('Corte + barba',              'Combo completo de corte e barba com acabamento em navalha.',            7000,  60, true,  1),
  ('Corte + barba + sobrancelha','Combo completo de corte, barba e sobrancelha.',                        8500,  60, true,  2),
  ('Corte',                      'Corte de cabelo completo com acabamento.',                              4000,  60, true,  3),
  ('Barba',                      'Barba com acabamento em navalha.',                                     3000,  60, true,  4),
  ('Luzes',                      'Coloração com técnica de luzes para um visual moderno e natural.',     6000,  60, true,  5),
  ('Platinado',                  'Descoloração completa para o visual platinado exclusivo.',             11000, 60, true,  6),
  ('Relaxamento',                'Tratamento de relaxamento capilar para fios alinhados e macios.',      4000,  60, true,  7),
  ('Limpeza de pele',            'Limpeza de pele profunda para uma pele saudável e renovada.',          2000,  60, true,  8),
  ('Sobrancelha',                'Design e limpeza de sobrancelha com acabamento preciso.',              1500,  60, true,  9),
  ('Cavanhaque',                 'Modelagem de cavanhaque com navalha e acabamento perfeito.',           1500,  60, true, 10),
  ('Pezinho',                    'Acabamento no pezinho para manter o visual impecável entre cortes.',   2000,  60, true, 11)
ON CONFLICT (name) DO UPDATE SET
  active     = true,
  sort_order = EXCLUDED.sort_order,
  price_cents = EXCLUDED.price_cents,
  duration_min = EXCLUDED.duration_min,
  description = EXCLUDED.description;

-- Verificação: deve retornar 11 serviços ativos
SELECT id, name, price_cents, active, sort_order
FROM services
ORDER BY sort_order;
