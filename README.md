# Eupresa Gestão

Sistema interno para uma empresa de instalações controlar clientes, equipe,
orçamentos, serviços, custos reais, documentos e preparação fiscal.

## Stack

- Next.js 16, React 19 e TypeScript
- Supabase Postgres, Auth, Storage e RLS
- Vercel
- Zod, Docxtemplater, PizZip e `docx`

## Funcionalidades

- Login e primeiro acesso com Supabase Auth
- Clientes com endereço principal
- Equipe com diária, meia diária e bônus
- Orçamento e serviço como um único ciclo operacional
- Snapshots de valores de equipe e itens
- Custos internos por categoria e margem real
- Quadro por status com indicadores acessíveis
- Geração de orçamento `.docx`
- Template Word privado no Supabase Storage
- Dashboard operacional e financeiro
- Fiscal assistido com anexos XML/PDF

## Rodar localmente

```bash
npm install
copy .env.example .env.local
npm run dev
```

Sem variáveis do Supabase, o app abre em modo de demonstração somente leitura.

## Variáveis

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use apenas a chave publicável no navegador. Não adicione `service_role` ao app.

## Banco

A migration inicial está em `supabase/migrations`. Ela cria:

- tabelas relacionais e enums;
- histórico automático de status;
- views `v_service_financials`, `v_dashboard_monthly` e
  `v_services_by_status`;
- RLS para todos os dados expostos;
- buckets privados `document-templates`, `generated-documents` e
  `service-attachments`;
- tipos de serviço e itens básicos.

Para aplicar em um projeto já vinculado:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## Template Word

O sistema aceita um `.docx` com os placeholders:

```text
{cliente_nome}
{cliente_documento}
{cliente_endereco}
{servico_titulo}
{servico_descricao}
{servico_valor_total}
{servico_data}
{validade_orcamento}
{observacoes_cliente}
{#itens}
{descricao} {quantidade} {unidade} {valor_unitario} {valor_total}
{/itens}
```

Sem template ativo, o sistema gera um documento padrão.

## Validação

```bash
npm run lint
npm run build
```

## Limites do MVP

- A emissão fiscal automática não está habilitada.
- O tipo de nota deve ser validado com a contabilidade.
- O acesso operacional é compartilhado entre usuários autenticados; o papel
  `ADMIN` fica preparado para políticas mais restritas em uma fase futura.
- Backups dos objetos do Storage devem ser configurados separadamente.
