-- ============================================================
-- OnStyle Barbearia — Atualização de Horários e Endereço
-- Execute este script no SQL Editor do Lovable/Supabase
-- ============================================================

-- Horários de funcionamento:
-- Segunda a Sábado: 09:00 às 19:00
-- Domingo: 09:00 às 13:00

-- weekday: 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta,
--          4 = Quinta, 5 = Sexta, 6 = Sábado

-- Limpar e recriar todos os horários
DELETE FROM business_hours;

INSERT INTO business_hours (weekday, open_time, close_time, closed) VALUES
  (0, '09:00', '13:00', false),  -- Domingo
  (1, '09:00', '19:00', false),  -- Segunda
  (2, '09:00', '19:00', false),  -- Terça
  (3, '09:00', '19:00', false),  -- Quarta
  (4, '09:00', '19:00', false),  -- Quinta
  (5, '09:00', '19:00', false),  -- Sexta
  (6, '09:00', '19:00', false);  -- Sábado

-- Atualizar endereço no settings (se existir a tabela settings)
UPDATE settings
SET address = 'Avenida Carlos Lacerda, 183'
WHERE id = 1;

-- Verificar resultado
SELECT weekday, open_time, close_time, closed FROM business_hours ORDER BY weekday;
SELECT address FROM settings WHERE id = 1;
