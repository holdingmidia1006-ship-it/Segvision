# Módulo de visitas

## Plano técnico

- Reaproveitar `clients`, `client_addresses`, `services` e `profiles`.
- Usar `services` como orçamento e execução, sem criar entidades duplicadas.
- Criar visitas, responsáveis, anexos, contatos e observações do cliente.
- Unificar calendário, histórico do cliente e métricas por views com RLS.
- Manter `ADMIN` com acesso total e `OPERADOR` limitado às visitas próprias ou
  atribuídas.

## Fluxos

1. Cadastro relâmpago cria ou reutiliza um cliente e agenda a visita.
2. A agenda oferece visões de mês, semana e hoje.
3. A visita pode ser confirmada, concluída, reagendada ou cancelada.
4. A conversão cria um orçamento em `services` e preserva a origem.
5. O detalhe do cliente reúne visitas, observações, serviços e fiscal.
6. Anexos são armazenados no bucket privado `visit-attachments`.

## Autenticação

- `NEXT_PUBLIC_SITE_URL` define a origem canônica de produção.
- `/forgot-password` solicita o link de recuperação.
- `/auth/confirm?next=/reset-password` resolve a sessão PKCE.
- `/reset-password` permite definir a nova senha.

No Supabase Auth, configure como URLs permitidas:

```text
http://localhost:3000/auth/confirm
https://segvision.vercel.app/auth/confirm
```

## QA manual

- [ ] Criar uma visita relâmpago para cliente novo.
- [ ] Criar uma visita para cliente existente.
- [ ] Filtrar agenda por status e tipo.
- [ ] Alternar entre mês, semana e hoje.
- [ ] Reagendar, concluir e cancelar uma visita.
- [ ] Converter visita em orçamento.
- [ ] Enviar e baixar anexo.
- [ ] Abrir WhatsApp, ligação e Google Agenda.
- [ ] Abrir cliente e conferir a linha do tempo.
- [ ] Registrar observação comercial e técnica.
- [ ] Confirmar que operador não acessa visita de outro usuário.
- [ ] Solicitar recuperação e definir nova senha.
- [ ] Conferir celular, tablet e desktop.
