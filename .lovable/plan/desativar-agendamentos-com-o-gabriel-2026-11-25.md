# Desativar agendamentos com o Gabriel

## O que muda para o cliente
- No site, o Gabriel continua aparecendo na equipe, mas no agendamento ele fica marcado como "Agenda indisponível" e não pode ser escolhido.
- Nenhum horário do Gabriel é mostrado, em nenhum dia.
- Mesmo que alguém tente agendar por fora (link antigo, etc.), o sistema recusa.
- O Romario continua funcionando normalmente.
- O Gabriel continua entrando no painel e vendo os agendamentos já marcados (nada é apagado).

## Para reativar depois
- Basta pedir e eu ligo a agenda dele de novo (é só um interruptor).

## Detalhes técnicos
- Migração: nova coluna `barbers.booking_enabled boolean not null default true`; definir `false` para o Gabriel (id 50818031-...).
- Atualizar `create_public_booking` para retornar `{ok:false, error:"Este barbeiro não está aceitando agendamentos no momento."}` quando `booking_enabled = false`.
- `getSiteData`: incluir `booking_enabled` na lista de barbeiros.
- `getAvailability`: retornar `slots: []` se o barbeiro estiver com agenda desligada.
- `booking-modal.tsx`: botão do barbeiro desabilitado com o selo "Agenda indisponível".
