# Site na Vercel mantendo o Lovable Cloud

## Resposta curta
Sim, é possível. O banco, os logins, barbeiros, agendamentos, produtos e horários continuam exatamente onde estão. Nenhum dado é migrado, apagado ou recriado.

## Por que dá erro 500 hoje
- As partes do site que rodam no servidor (listar barbeiros/serviços/horários, calcular horários livres e criar agendamento) usam uma "chave de serviço" que só existe dentro do Lovable.
- Na Vercel essa chave não existe, então o servidor falha.
- Detalhe importante: neste projeto essa chave já aponta para a chave pública do backend, ou seja, o sistema já funciona sem a chave secreta de verdade.

## O que precisaria mudar
1. **Na Vercel (sem código):** cadastrar 4 variáveis, todas públicas e seguras de expor:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
   (os valores são os mesmos já usados pelo site; eu te passo.)
2. **No código (pequeno ajuste):** as funções públicas do site passam a usar a chave pública em vez da "chave de serviço". Resultado idêntico para o cliente.
3. **Criação de agendamento:** hoje a checagem de conflito e o registro da notificação rodam no servidor; passam a rodar numa função segura dentro do próprio banco (mesmas regras: horário futuro, sem conflito, sem bloqueio, avisa o barbeiro). Nenhum dado existente é tocado.
4. **Configuração de hospedagem:** o projeto hoje é empacotado para outro tipo de servidor; é preciso ajustar para gerar a versão compatível com a Vercel.

## O que NÃO muda
- Painel administrativo, login do Rian e do Lemuel, separação de dados por barbeiro.
- Agendamentos, produtos/estoque, horários, clientes e financeiro existentes.
- O site continua funcionando também no endereço do Lovable.

## Riscos / pontos de atenção
- Antes de mudar, confirmo que as regras de acesso do banco permitem ao visitante apenas ler barbeiros/serviços/horários ativos e ver horários ocupados (sem dados de clientes).
- Futuras alterações feitas no Lovable precisam ser reenviadas à Vercel (via GitHub) para aparecer no seu domínio.
- Login pelo painel funciona normalmente; se no futuro for usado login com Google, o domínio novo precisaria ser liberado.

## Detalhes técnicos
- `src/lib/public.functions.ts`: trocar `supabaseAdmin` por cliente com publishable key (shim `apikey` para chaves `sb_`), lendo `process.env` dentro do handler.
- Migração aditiva: função `create_public_booking(...)` SECURITY DEFINER com validações atuais + insert em `notifications`; `GRANT EXECUTE` a `anon`; view/RPC de ocupação retornando só `starts_at/ends_at`.
- Verificar policies `TO anon` em `barbers`, `services`, `business_hours`, `settings`.
- `vite.config.ts`: preset Nitro `vercel` ao buildar fora do Lovable (condicional por env, mantendo cloudflare no Lovable).
- Testar: carregar site, ver horários, criar agendamento teste e cancelar, logar no painel.
