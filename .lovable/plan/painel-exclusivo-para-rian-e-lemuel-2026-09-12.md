# Painel exclusivo para Rian e Lemuel

Somente Rian e Lemuel terão login no painel. Cada um entra com a própria conta e vê **apenas os seus dados** — agendamentos, receita e clientes do próprio atendimento —, sem acesso ao painel do outro.

## O que será feito

1. Criar a conta de acesso do Lemuel com o e-mail e a senha informados, já confirmada (sem etapa de validação por e-mail).
2. Vincular a conta do Lemuel ao profissional "Lemuel" já cadastrado (a do Rian já está vinculada).
3. Definir os dois como barbeiros com painel próprio: nenhum deles vê a agenda, a receita ou os clientes do outro.
4. Remover as regras atuais que tratavam esses e-mails como administrador geral, que davam visão de todos os profissionais.
5. Manter o painel fechado para qualquer outra pessoa: quem não for Rian ou Lemuel não entra.
6. Testar os dois logins e confirmar que cada painel mostra somente os dados do respectivo barbeiro.

## Situação hoje

- Existe apenas a conta do Rian, hoje com permissão de administrador geral, ligada ao profissional Rian.
- O Lemuel ainda não tem conta de acesso.
- O aplicativo trata os dois e-mails como administradores, o que hoje daria a eles visão completa de todos os agendamentos.

## Detalhes técnicos

- Criar o usuário do Lemuel via Auth Admin API (senha nunca no código-fonte); inserir `user_roles` com `role = 'barber'` e apontar `barbers.user_id` do registro "Lemuel".
- Trocar a role do Rian de `admin` para `barber` em `user_roles` para que os filtros por `barber_id` valham para ele também.
- Migração: substituir os gatilhos de `20260910190200_admin_setup.sql` e `20260912165000_add_lemuel_admin.sql` por lógica que conceda `barber` a esses dois e-mails no signup, sem `admin`.
- `src/hooks/use-barber-auth.ts`: remover `isAdminEmail` (fallback admin), manter o vínculo automático ao barbeiro por nome e exigir `role === 'barber'` + barbeiro vinculado para `isAuthorized`.
- `src/routes/painel.tsx`: já filtra por `barber.id` e esconde blocos `role === "admin"`; garantir que sem `barber.id` vinculado nada seja listado (nunca cair em consulta sem filtro).
- Verificação com Playwright em `localhost:8080`: login de cada conta, abrir `/painel`, conferir que só aparecem os agendamentos do próprio barbeiro.
