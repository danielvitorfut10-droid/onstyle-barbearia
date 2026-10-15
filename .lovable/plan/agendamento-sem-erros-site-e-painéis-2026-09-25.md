# Agendamento sem erros (site e painéis)

## O que encontrei
- O preço que o cliente vê no site nem sempre é o preço salvo no agendamento. O site mostra Barba R$ 30 e Corte + Barba R$ 60, mas no cadastro estão R$ 20 e R$ 50. Com isso, os agendamentos e a receita do painel ficam com o valor antigo.
- O serviço "Corte + Sobrancelha + Cavanhaque" continua ativo no cadastro, embora esteja escondido no site. Nos painéis ele ainda aparece para escolher.
- O agendamento do mesmo dia pelo site e pelos painéis já foi corrigido na última alteração, mas ainda não foi testado de ponta a ponta.

## O que vou fazer
1. Atualizar o cadastro de serviços para ficar igual ao que o site mostra:
   - Barba: R$ 30, "barba com acabamento em navalha".
   - Corte + Barba: R$ 60.
   - Corte + barba + sobrancelha: R$ 70, 75 min.
   - Desativar (sem apagar) "Corte + Sobrancelha + Cavanhaque".
2. Tirar do site os ajustes "manuais" de preço e nome de serviço, para que site, agendamento e painel usem sempre os mesmos dados.
3. Testar de ponta a ponta, com um horário de hoje:
   - Agendar pelo site cada tipo de serviço, depois cancelar os testes.
   - Adicionar um atendimento no painel do Rian e no painel do Lemuel, depois apagar os testes.
   - Confirmar que um horário já ocupado mostra uma mensagem clara, e não um erro.
4. Corrigir qualquer outro erro que aparecer nesses testes.

## O que não muda
Os agendamentos, clientes, a receita e os logins atuais continuam como estão. Nenhum dado é apagado.

## Detalhes técnicos
- Migração de dados: UPDATE em `services` (preço, descrição, sort_order) e `active=false` no cavanhaque.
- `src/lib/public.functions.ts`: remover os overrides de serviços e o fallback `srv-combo-70` (id que não é uuid e quebrava o zod).
- Testes via RPC `create_public_booking` com a chave pública e via Playwright no painel. Os registros de teste são removidos no final.
