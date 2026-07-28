# Auditoria funcional, relacional e responsiva - SEG VISIOM

Data da auditoria: 28/07/2026

## Escopo e regra de seguranca

Esta auditoria foi feita antes da reconstrucao visual para preservar as
funcionalidades existentes. Foram analisados:

- rotas e navegacao;
- consultas e Server Actions;
- formularios, listagens e detalhes;
- estados de interface;
- responsividade;
- chaves estrangeiras, exclusoes, RLS, Storage, indices e orfaos no Supabase.

Nenhuma migration, alteracao de tabela, indice, funcao, policy RLS ou bucket foi
aplicada durante esta auditoria. Todo SQL deste documento e apenas recomendacao
para avaliacao e aprovacao previa da Paulina.

## Resumo executivo

O projeto nao precisa de uma reescrita estrutural. A base Next.js + Supabase
esta funcional, as tabelas publicas usam RLS, os arquivos ficam em buckets
privados e nao foram encontrados registros orfaos nas relacoes auditadas.

Os principais problemas encontrados estao na camada de operacao:

1. O CRUD esta incompleto em quase todos os modulos. A criacao funciona, mas
   varias entidades nao podem ser editadas ou excluidas pela interface.
2. Listagens em tabela mantem largura minima entre 640 e 700 px no celular e
   exigem rolagem horizontal.
3. Exclusoes atuais usam botoes diretos, sem confirmacao contextual.
4. O feedback depende principalmente de parametros na URL e nao cobre erro,
   carregamento e sucesso de forma consistente.
5. Equipe operacional esta dividida entre `profiles` e `employees`, o que cria
   dois cadastros de pessoas com papeis diferentes e pouco claros para o usuario.
6. A exclusao de cliente tem comportamento assimetrico: visitas sao apagadas em
   cascata, mas a existencia de um servico impede a exclusao do mesmo cliente.

## Mapa de navegacao

### Acesso publico

| Rota | Finalidade | Situacao |
| --- | --- | --- |
| `/login` | Entrar na plataforma | Funcional |
| `/forgot-password` | Solicitar recuperacao | Funcional |
| `/reset-password` | Definir nova senha | Funcional |
| `/access-disabled` | Informar usuario inativo | Funcional |

### Aplicacao autenticada

| Rota | Finalidade | Navegacao atual |
| --- | --- | --- |
| `/dashboard` | Resumo e atalhos do fluxo principal | Menu principal e barra inferior |
| `/clients` | Listar, criar e excluir clientes | Menu principal e barra inferior |
| `/clients/[id]` | Contato, historico e observacoes | A partir de Clientes |
| `/visits` | Agenda, filtros, calendario e lista | Menu principal e barra inferior |
| `/visits/new` | Visita rapida ou completa | Dashboard, Agenda e Cliente |
| `/visits/[id]` | Detalhe, edicao, anexos e conversao | Agenda e historico do Cliente |
| `/services` | Busca e listagem de orcamentos | Menu principal e barra inferior |
| `/services/new` | Criar orcamento | Orcamentos, Quadro e Cliente |
| `/services/[id]` | Itens, custos, status, termos e PDF | Orcamentos, Quadro e historicos |
| `/board` | Quadro por status de execucao | Menu secundario |
| `/documents` | Documentos gerados e modelos | Menu secundario |
| `/invoices` | Preparacao e controle fiscal | Menu secundario |
| `/team` | Cadastro de profissionais | Menu secundario, apenas ADMIN |
| `/settings` | Tipos de servico e catalogo | Menu secundario, apenas ADMIN |

### Leitura da arquitetura de navegacao

- O fluxo principal `Cliente -> Visita -> Orcamento -> Execucao` esta coerente.
- O menu inferior com quatro destinos e apropriado para campo.
- A secao "Mais opcoes" reduz ruido, mas precisa indicar melhor quando contem a
  pagina ativa e manter acesso facil a documentos e equipe.
- Existem dois nomes para a mesma entidade de negocio: a interface usa
  "Orcamentos", enquanto nomes internos e algumas mensagens ainda usam
  "Servicos". A interface deve usar "Orcamento" ate a aprovacao e "Servico" a
  partir da execucao, sem renomear tabelas.
- O modulo de notas fiscais esta separado de documentos, o que e correto, mas
  ambos precisam de links cruzados no detalhe do orcamento.

## Matriz CRUD atual

Legenda: `OK` disponivel; `Parcial` disponivel com limitacoes; `Ausente` nao
exposto na interface.

| Entidade | Criar | Ler/listar | Editar | Excluir | Observacao |
| --- | --- | --- | --- | --- | --- |
| Clientes | OK | OK | Ausente | Parcial | Excluir e ADMIN e nao pede confirmacao contextual |
| Enderecos do cliente | Parcial | OK | Ausente | Ausente | Apenas um endereco pode nascer junto com o cliente |
| Contatos do cliente | Ausente | Parcial | Ausente | Ausente | Tabela existe, mas nao ha gestao completa na UI |
| Observacoes do cliente | OK | OK | Ausente | Ausente | Criacao disponivel no detalhe |
| Visitas | OK | OK | OK | Ausente | Ha fluxo rapido, completo, anexos e conversao |
| Responsaveis da visita | Parcial | OK | Ausente | Ausente | Selecionados na criacao; usam `profiles` |
| Anexos da visita | OK | OK | Ausente | Ausente | Bucket privado e URL assinada |
| Orcamentos/servicos | OK | OK | Parcial | Ausente | Status e termos comerciais podem ser alterados |
| Itens do orcamento | OK | OK | Ausente | Ausente | Total calculado no banco |
| Custos do servico | OK | OK | Ausente | Ausente | Vinculo opcional com `employees` |
| Equipe do servico | Parcial | OK | Ausente | Ausente | Vinculo inicial existe, sem manutencao no detalhe |
| Historico de status | Automatico | OK | N/A | N/A | Mantido por trigger, somente leitura pela API |
| Anexos do servico | Parcial | Parcial | Ausente | Ausente | Estrutura existe, fluxo visual incompleto |
| PDF do orcamento | OK | OK | Via dados | Versionado | Geracao por rota e registro de documento |
| Documentos gerados | Automatico | OK | Ausente | Ausente | URLs assinadas, sem acao de limpeza |
| Modelos de documento | OK | OK | Ausente | Ausente | Apenas ADMIN cria |
| Documentos fiscais | OK | OK | Ausente | Ausente | Registro assistido, sem emissao automatica |
| Profissionais | OK | OK | Ausente | Parcial | Excluir e ADMIN e nao pede confirmacao contextual |
| Tipos de servico | OK | OK | Ausente | Ausente | Apenas ADMIN |
| Itens de catalogo | OK | OK | Ausente | Ausente | Apenas ADMIN |
| Configuracao da empresa | Leitura | Leitura | Ausente | N/A | Dados alimentam o PDF, sem formulario administrativo |

## Auditoria tela por tela

### Dashboard

Pontos preservados:

- indicadores;
- proximas visitas;
- orcamentos recentes;
- atalhos para cliente e visita;
- explicacao do fluxo.

Melhorias necessarias:

- substituir a tabela recente por cards no celular;
- incluir skeleton de carregamento;
- tornar cards de indicadores clicaveis quando representam filtros;
- destacar apenas uma acao primaria;
- apresentar erro de consulta sem derrubar toda a pagina.

### Clientes

Pontos preservados:

- listagem em cards;
- cadastro rapido;
- telefone, documento e endereco inicial;
- exclusao por ADMIN;
- detalhe com contato, historico e observacoes.

Melhorias necessarias:

- busca e filtros;
- paginacao;
- edicao completa;
- CRUD de multiplos enderecos e endereco principal;
- CRUD de contatos;
- mascara e validacao de CPF/CNPJ, telefone e CEP;
- confirmacao de exclusao com explicacao das dependencias;
- estado vazio com acao e erro de submissao junto ao campo.

### Visitas

Pontos preservados:

- cadastro rapido e completo;
- filtros;
- visualizacao por mes, semana e hoje;
- responsaveis;
- anexos;
- edicao;
- Google Agenda;
- conversao em orcamento.

Melhorias necessarias:

- no celular, calendario deve virar agenda diaria/semanal em lista;
- reduzir campos iniciais e revelar detalhes progressivamente;
- permitir manutencao de responsaveis depois da criacao;
- exclusao/cancelamento com confirmacao;
- feedback de upload;
- prevenir conversao duplicada e submissao dupla.

### Equipe

Pontos preservados:

- cadastro, listagem, custo/hora e exclusao por ADMIN.

Melhorias necessarias:

- esclarecer diferenca entre usuario do sistema e profissional de campo;
- editar e inativar em vez de depender de exclusao;
- informar vinculos que bloqueiam a exclusao;
- busca por nome, funcao e status;
- avatar com iniciais e acoes consistentes.

### Orcamentos e servicos

Pontos preservados:

- criacao ligada a cliente, endereco, visita e tipo;
- item inicial;
- equipe inicial;
- busca e filtro de status;
- detalhe com itens, custos, status e termos comerciais;
- calculos de total, custo, lucro e margem;
- PDF e preparacao fiscal.

Melhorias necessarias:

- editar dados gerais do orcamento;
- editar/excluir itens e custos;
- manter equipe vinculada;
- confirmar mudancas irreversiveis de status;
- substituir tabela por cards no celular;
- mostrar resumo financeiro fixo e legivel;
- exibir erros de calculo e dados obrigatorios antes de gerar PDF;
- distinguir claramente "orcamento" de "servico em execucao";
- expor versoes do PDF e acao de nova geracao.

### Quadro

Pontos preservados:

- agrupamento por status;
- acesso ao detalhe;
- valor e prazo.

Melhorias necessarias:

- no celular, usar abas por status em vez de quadro horizontal;
- busca e filtros;
- estado vazio curto por coluna;
- contagem e totais por etapa;
- nao implementar arrastar e soltar ate existir persistencia e confirmacao.

### Documentos

Pontos preservados:

- documentos gerados;
- URLs assinadas;
- modelos enviados por ADMIN.

Melhorias necessarias:

- cards no celular;
- filtro por cliente, orcamento, tipo e data;
- informar versao e origem;
- excluir/arquivar com confirmacao;
- feedback de upload e limites de arquivo;
- separar visualmente "Gerados" e "Modelos".

### Notas fiscais

Pontos preservados:

- preparacao assistida;
- vinculo com servico;
- XML e PDF;
- aviso de que nao ha transmissao para prefeitura ou SEFAZ.

Melhorias necessarias:

- fluxo em etapas: servico, tomador, dados fiscais e anexos;
- preencher automaticamente tomador e valor ao selecionar servico;
- editar status e dados apos a preparacao;
- cards no celular;
- validacao de URL, chave, numero e valor;
- manter o aviso fiscal sempre visivel antes da confirmacao.

### Configuracoes

Pontos preservados:

- tipos de servico;
- catalogo com custo e venda;
- restricao de acesso a ADMIN.

Melhorias necessarias:

- editar, inativar e excluir com protecao de vinculos;
- busca;
- configuracao visual da empresa e dados usados no PDF;
- separar secoes com abas;
- explicar impacto de cada configuracao.

## Auditoria responsiva e de acessibilidade

### Resultado por largura

| Largura | Resultado atual | Risco |
| --- | --- | --- |
| 360 px | Navegacao inferior funciona, formularios viram uma coluna | Tabelas e quadro ainda exigem rolagem horizontal |
| 768 px | Sidebar vira menu e conteudo se reorganiza | Algumas grades e areas densas continuam com excesso de informacao |
| 1280 px | Boa utilizacao do espaco | Hierarquia visual e estados ainda inconsistentes |

### Problemas tecnicos encontrados

- `.data-table` usa largura minima de 640/680 px mesmo em telas pequenas.
- `.table-wrap` permite `overflow-x: auto`; isso evita quebra, mas nao atende ao
  requisito de zero rolagem horizontal.
- `.kanban` tambem usa rolagem horizontal.
- Nem todas as rotas possuem `loading.tsx` e `error.tsx`.
- Formularios usam labels reais, mas mensagens de erro nao estao associadas com
  `aria-describedby`.
- Estados de sucesso existem apenas em parte das criacoes.
- Exclusoes nao usam dialogo de confirmacao acessivel.
- Alvos principais tem cerca de 44 px, um bom ponto de partida para toque.
- O CSS desativa animacoes com `prefers-reduced-motion`, o que deve ser mantido.

## Auditoria relacional do Supabase

### Inventario e protecao

- 21 tabelas no schema `public` com RLS habilitado.
- Todas as tabelas possuem ao menos uma policy.
- Policies separam usuario ativo, ADMIN, autor, dono do servico e responsavel
  pela visita conforme a entidade.
- Funcoes `SECURITY DEFINER` sensiveis usam `search_path` fixado.
- `service_status_history` e somente leitura para o cliente; a escrita e feita
  por trigger, comportamento adequado para trilha de auditoria.
- Nao foram encontrados orfaos nas 16 relacoes principais consultadas.

### Storage

| Bucket | Publico | Limite |
| --- | --- | --- |
| `document-templates` | Nao | 10 MB |
| `generated-documents` | Nao | 10 MB |
| `service-attachments` | Nao | 20 MB |
| `visit-attachments` | Nao | 20 MB |

O acesso a `storage.objects` usa policies de SELECT, INSERT, UPDATE e DELETE
baseadas em `private.can_access_private_file(bucket_id, name)`.

### Saude das chaves estrangeiras

Comportamentos adequados:

- itens, custos, historico, anexos e documentos do servico usam `ON DELETE
  CASCADE` quando o servico pai e removido;
- referencias historicas opcionais usam `ON DELETE SET NULL`;
- enderecos e contatos pertencem ao cliente e usam `CASCADE`;
- anexos e responsaveis pertencem a visita e usam `CASCADE`.

Pontos que exigem decisao de negocio:

1. `visits.client_id` usa `CASCADE`, mas `services.client_id` usa `NO ACTION`.
   Excluir um cliente sem servico apaga visitas; excluir um cliente com servico
   falha. A operacao fica imprevisivel e pode apagar historico de campo.
2. `service_employees` aponta para `employees`, enquanto `visit_assignees`
   aponta para `profiles`. A pessoa escalada para uma visita e o profissional
   contabilizado no servico podem nao ser a mesma entidade.
3. `service_employees.employee_id` usa `NO ACTION`, corretamente bloqueando a
   exclusao de profissional vinculado, mas a interface nao explica o bloqueio.
4. `created_by` em visitas e observacoes usa `RESTRICT`, enquanto outras tabelas
   usam `SET NULL`. Isso preserva autoria, mas pode impedir remocao de usuario.

### Indices

As colunas principais de relacao e consulta possuem indices, incluindo cliente,
status e data de servicos, cliente/data de visitas, responsaveis, anexos, custos,
historico e documentos.

O advisor de performance marcou varios indices como nao utilizados. Isso nao e
evidencia suficiente para remove-los: o banco ainda tem pouco volume e varios
indices protegem consultas e FKs que serao mais frequentes com o uso. A
recomendacao atual e manter e reavaliar apos trafego real.

### Alerta de seguranca

O advisor de seguranca encontrou um aviso: protecao contra senhas vazadas esta
desativada no Supabase Auth.

Referencia:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## SQL recomendado - NAO APLICADO

Os blocos abaixo sao propostas para revisao. Nao executar sem aprovacao da
Paulina, backup e teste em branch do Supabase.

### Opcao A - preservar historico ao excluir cliente

Esta e a opcao preferida: em vez de apagar clientes, adicionar arquivamento
logico e remover a acao destrutiva da operacao cotidiana.

```sql
begin;

alter table public.clients
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid
    references auth.users(id) on delete set null;

create index if not exists clients_active_name_idx
  on public.clients (name)
  where archived_at is null;

commit;
```

Impacto esperado: consultas, views e policies devem ser revisadas para decidir
quem visualiza clientes arquivados. Nao aplicar isoladamente.

### Opcao B - impedir cascata de cliente para visita

Usar somente se a decisao for manter exclusao fisica e bloquear clientes com
qualquer historico.

```sql
begin;

alter table public.visits
  drop constraint visits_client_id_fkey;

alter table public.visits
  add constraint visits_client_id_fkey
  foreign key (client_id)
  references public.clients(id)
  on delete restrict;

commit;
```

Impacto esperado: a interface deve oferecer arquivamento ou explicar por que o
cliente nao pode ser excluido.

### Vincular profissional de campo a usuario do sistema

Esta proposta mantem `employees` para custos/operacao e `profiles` para acesso,
mas permite saber quando representam a mesma pessoa.

```sql
begin;

alter table public.employees
  add column if not exists profile_id uuid unique
    references public.profiles(id) on delete set null;

create index if not exists employees_profile_idx
  on public.employees (profile_id);

commit;
```

Impacto esperado: a UI de equipe deve permitir vinculo opcional e a escalacao
de visita deve exibir profissionais vinculados. Policies precisam de revisao.

### Busca normalizada por cliente

Aplicar apenas quando a busca sair do filtro local e passar a consultar grande
volume no banco.

```sql
begin;

create extension if not exists pg_trgm;

create index if not exists clients_name_trgm_idx
  on public.clients using gin (lower(name) gin_trgm_ops);

create index if not exists clients_phone_digits_idx
  on public.clients (
    regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
  );

commit;
```

## Ordem recomendada de implementacao

1. Consolidar tokens visuais e componentes reutilizaveis.
2. Adicionar estados globais de carregamento, erro, vazio e feedback.
3. Tornar Dashboard, Clientes, Agenda e Orcamentos totalmente responsivos.
4. Completar CRUD de clientes/endereco e itens/custos do orcamento.
5. Ajustar Quadro, Documentos, Notas, Equipe e Configuracoes.
6. Validar teclado, foco, leitores de tela e movimento reduzido.
7. Rodar lint, testes, build e verificacao visual em 360, 768 e 1280 px.

## Criterio de aceite

- nenhuma funcionalidade atual removida;
- nenhum SQL aplicado sem aprovacao;
- zero rolagem horizontal nas telas operacionais;
- formularios com validacao e feedback proximos do campo;
- acoes destrutivas com confirmacao;
- submissao dupla bloqueada;
- estados de carregamento, vazio, erro e sucesso em todos os modulos;
- navegacao utilizavel com teclado e toque;
- lint, testes e build aprovados;
- capturas revisadas em 360, 768 e 1280 px.
