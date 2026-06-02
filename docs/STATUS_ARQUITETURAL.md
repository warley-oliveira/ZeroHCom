# Relatório de Status Arquitetural — ZeroHCom

> **Hand-off:** Tech Lead → Arquiteto de Software
> **Data:** 2026-05-29
> **Branch:** `feat/assets-agreements-ledger`
> **Escopo:** Etapas 1 e 2 concluídas — Motor de Ativos, Contratos (Agreements) e Ledger (Transactions).
> **Stack:** Rails 8.1 API-only (PostgreSQL, JWT/HS256) + React 18/Vite/TS estrito (Tailwind v4 + Shadcn v4, TanStack Router/Query, Axios).

---

## 0. TL;DR para o Arquiteto

| Área | Status | Observação |
|---|:---:|---|
| Schema PostgreSQL (UUID, money-rails, jsonb) | ✅ | Padrão consistente, índices corretos, FKs com `on_delete` explícito |
| Models + multi-tenant + validações | ✅ | Validação de cross-org em Agreement/Invoice; enums via `index_with` |
| Serialização | ⚠️ | **POROs manuais por controller** (sem AMS/Jbuilder) — funciona, mas não escala |
| Front-end (types, Query, tabelas Shadcn) | ✅ | `/assets`, `/agreements`, `/ledger` consumindo via TanStack Query |
| Auth JWT (localStorage + interceptor 401) | ✅ | Implementado e global |
| Testes (RSpec) | ✅ | **94 examples, 0 failures, 0 pending** |
| **Gaps a resolver antes de regras de negócio** | ⚠️ | `Payment` sem controller/rota; tipo de `id` divergente no front; sem `Pundit`/`Current` setado em `BaseController` (ver §6) |

---

## 1. Estado do Banco de Dados (`db/schema.rb`)

Versão do schema: `2026_05_29_174744`. Extensões: `plpgsql`, `pgcrypto`.
**Todas as tabelas usam PK `uuid`** com `default: gen_random_uuid()`.

### 1.1 `customers`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `organization_id` | uuid, **null: false** | FK → organizations (`on_delete: :restrict`) |
| `name` | string, **null: false** | |
| `email` | string | nullable |
| `external_id` | string | idempotência de integração |
| `created_at` / `updated_at` | datetime | |

Índices: `organization_id`; **único** composto `(organization_id, external_id)` *where external_id IS NOT NULL* — garante idempotência por tenant sem bloquear clientes sem `external_id`.

### 1.2 `assets`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `organization_id` | uuid, **null: false** | FK → organizations (`:restrict`) |
| `name` | string, **null: false** | |
| `asset_type` | string | nullable |
| `status` | string, **null: false**, default `"available"` | |
| **`metadata`** | **`jsonb`, null: false, default `{}`** | ✅ tipado corretamente como `jsonb` |
| `created_at` / `updated_at` | datetime | |

Índices: `asset_type`, `status`, `organization_id` e **`metadata` usando GIN** (`using: :gin`) — pronto para queries por chave/valor no JSON.

> ✅ **Confirmado:** `metadata` é `jsonb` (não `json`/`text`), com default `{}` e índice GIN. É o ponto correto para atributos schemaless por tipo de ativo (placa, série, m², etc.).

### 1.3 `agreements`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `organization_id` | uuid, **null: false** | FK → organizations (`:restrict`) |
| `customer_id` | uuid, **null: false** | FK → customers (`:restrict`) |
| `asset_id` | uuid (nullable) | FK → assets (**`on_delete: :nullify`**) |
| **`amount_cents`** | **integer, null: false, default 0** | money-rails |
| **`currency`** | **string, null: false, default `"AUD"`** | money-rails |
| `billing_cycle` | string | nullable (ex.: `weekly`/`monthly`) |
| `status` | string, null: false, default `"active"` | |
| `start_date` / `end_date` | date | |

Índices: `asset_id`, `customer_id`, `organization_id`, `status`.

### 1.4 `invoices`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `organization_id` | uuid, **null: false** | FK (`:restrict`) |
| `customer_id` | uuid, **null: false** | FK (`:restrict`) |
| `agreement_id` | uuid (nullable) | FK (**`:nullify`**) — invoice sobrevive ao cancelamento do contrato |
| **`amount_cents`** | integer, null: false, default 0 | money-rails |
| **`currency`** | string, null: false, default `"AUD"` | money-rails |
| `status` | string, null: false, default `"draft"` | |
| `issue_date` / `due_date` | date, **null: false** | |
| `external_id` | string | idempotência |

Índices: `agreement_id`, `customer_id`, `due_date`, `status`, `organization_id`, e **único** `(organization_id, external_id)` *where external_id IS NOT NULL*.

### 1.5 `payments`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `invoice_id` | uuid, **null: false** | FK → invoices (**`on_delete: :cascade`**) |
| **`amount_cents`** | integer, null: false, default 0 | money-rails |
| **`currency`** | string, null: false, default `"AUD"` | money-rails |
| `method` | string, **null: false** | |
| `payment_date` | datetime, **null: false** | |
| `external_id` | string | |

Índices: `invoice_id`, `external_id`.
> ⚠️ `payments` **não tem coluna `organization_id` própria** — o tenant é derivado via `delegate` do `invoice` (ver §2.6). Não há endpoint exposto ainda (ver §6).

### 1.6 `transactions` (Ledger)
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `organization_id` | uuid, **null: false** | FK (`:restrict`) |
| **`amount_cents`** | integer, null: false, default 0 | money-rails |
| **`currency`** | string, null: false, default `"AUD"` | money-rails |
| `direction` | string | `income`/`expense` (enum no model) |
| `category` | string | |
| `date` | **datetime** | ⚠️ é `datetime`, não `date` (ver §7) |
| `source_type` / `source_id` | string / uuid | **associação polimórfica** (`source`) |

Índices: `category`, `organization_id`, e composto `(source_type, source_id)`.

### 1.7 money-rails — padrão adotado

Todas as tabelas monetárias seguem o mesmo par: **`amount_cents` (integer)** + **`currency` (string, default `"AUD"`)**. No model: `monetize :amount_cents, with_model_currency: :currency`. Ou seja, a moeda é **por-registro** (coluna `currency`), não global — correto para multi-moeda futuro. A API expõe tanto `amount_cents` (cru) quanto `amount_formatted` (formatado server-side via `Money#format`).

---

## 2. Associações, Validações e Lógica de Negócio (Models)

### 2.1 `Organization`
- `has_many`: `users` (`:destroy`), `customers`, `invoices`, `assets`, `agreements`, `transactions` — todos `:restrict_with_error`.
- Valida `name` (presença) e `slug` (presença, unicidade, formato lowercase alfanumérico/dashes).

### 2.2 `Customer`
- `belongs_to :organization`; `has_many :invoices`, `:agreements` (ambos `:restrict_with_error`).
- Valida `name`; valida `email` por `URI::MailTo::EMAIL_REGEXP` (`allow_blank: true`).

### 2.3 `Asset`
- `belongs_to :organization`; `has_many :agreements, dependent: :nullify`.
- **Enum** `status`: `available | rented | maintenance` (definido via `STATUSES.index_with(&:itself)` → enum string).
- Valida `name`. *(Sem money — asset não carrega valor.)*

### 2.4 `Agreement`
- `belongs_to :organization, :customer`; `belongs_to :asset, optional: true`; `has_many :invoices, dependent: :nullify`.
- `monetize :amount_cents`.
- **Enum** `status`: `active | cancelled | paused`.
- **Validações customizadas de integridade multi-tenant:**
  - `customer_in_same_organization` — recusa contrato cujo cliente é de outra org.
  - `asset_in_same_organization` — idem para o ativo.
- Valida `currency` (presença).

### 2.5 `Invoice`
- `belongs_to :organization, :customer`; `belongs_to :agreement, optional: true`; `has_many :payments, dependent: :destroy`.
- `monetize :amount_cents`.
- **Enum** `status`: `draft | open | paid | overdue | cancelled`.
- Valida `currency`, `issue_date`, `due_date`; validação customizada `customer_in_same_organization`.

### 2.6 `Payment`
- `belongs_to :invoice`; **`delegate :organization, :organization_id, to: :invoice`** (tenant herdado, sem coluna própria).
- `monetize :amount_cents`. Valida `payment_date` e `method`.

### 2.7 `Transaction` (Ledger)
- `belongs_to :organization`; **`belongs_to :source, polymorphic: true, optional: true`** (pode apontar para Invoice, Payment, etc.).
- `monetize :amount_cents`.
- **Enum** `direction`: `income | expense`.
- Valida `currency`, `category`, `date`.

> **Resumo de lógica de negócio:** o que existe hoje é **integridade de dados** (enums, presença, e o invariante cross-org em Agreement/Invoice). **Ainda não há regras de negócio "de fluxo"** — ex.: gerar invoice a partir de um agreement no ciclo, baixar invoice ao registrar payment, ou lançar transaction automática no ledger quando um payment é criado. A associação polimórfica `transaction.source` está pronta para isso, mas o disparo é manual/ausente. **Este é o terreno natural da próxima etapa.**

---

## 3. Contratos de API (Serialização)

### 3.1 Abordagem

**Não há AMS, Jbuilder nem `serializers/`.** Cada controller renderiza **POROs (Hash) manuais** via método privado `serialize(record)` + `render json:`. Padrão idêntico nos três controllers novos (`assets`, `agreements`, `transactions`):

- `index`: `render json: collection.map { |r| serialize(r) }`
- Multi-tenant via `Current.organization.<assoc>` (escopo sempre por org).
- Erros de validação: `render json: { errors: record.errors }, status: :unprocessable_entity` (422).
- `find_*` usa `Current.organization.<assoc>.find(id)` → 404 cross-tenant garantido pelo scope.

> ⚠️ **Trade-off arquitetural:** serialização manual é simples e explícita (controle total do payload, formatação de Money no server), mas **duplica forma** e não tem contrato versionado. Para o Arquiteto decidir: manter POROs, adotar um serializer (AMS / Alba / `Oj` + presenters), ou gerar tipos a partir de OpenAPI (sugestão #3 do CLAUDE.md raiz). Hoje o front "espelha à mão" os tipos (§4).

### 3.2 Exemplo de payload — `GET /api/v1/assets`

Serializador em [api/app/controllers/api/v1/assets_controller.rb:49](../api/app/controllers/api/v1/assets_controller.rb#L49). Retorna um **array** (sem envelope `data`):

```json
[
  {
    "id": "9f1c2e7a-...-uuid",
    "name": "Van Sprinter 2022",
    "asset_type": "vehicle",
    "status": "available",
    "metadata": { "plate": "ABC1D23", "year": 2022 }
  }
]
```

> Note: `created_at`/`updated_at` **não** são expostos no payload de asset (decisão atual). `index` aceita filtro opcional `?asset_type=...`.

Para contraste, `GET /api/v1/agreements` faz **serialização aninhada** (`customer` + `asset` resumidos) e inclui `amount_cents` **e** `amount_formatted` (ex.: `"1,250.00"`, via `amount.format(symbol: false, no_cents_if_whole: false)`). Usa `includes(:customer, :asset)` para evitar N+1.

---

## 4. Estado do Front-end (React/TS)

### 4.1 Interfaces (`src/types/`)

**`asset.ts`**
```ts
export type AssetStatus = "available" | "rented" | "maintenance"
export interface Asset {
  id: string
  name: string
  asset_type: string | null
  status: AssetStatus
  metadata: Record<string, unknown>
}
```

**`agreement.ts`** (reusa `Pick<>` de Customer/Asset — bom acoplamento tipado)
```ts
export type AgreementStatus = "active" | "cancelled" | "paused"
export interface Agreement {
  id: string
  billing_cycle: string | null
  status: AgreementStatus
  start_date: string | null
  end_date: string | null
  currency: string
  amount_cents: number
  amount_formatted: string
  customer: Pick<Customer, "id" | "name" | "email" | "external_id">
  asset: Pick<Asset, "id" | "name" | "asset_type"> | null
}
```

**`transaction.ts`**
```ts
export type TransactionDirection = "income" | "expense"
export interface Transaction {
  id: string
  direction: TransactionDirection
  category: string
  date: string
  currency: string
  amount_cents: number
  amount_formatted: string
  source: { type: string; id: string } | null
}
```

> ✅ Os enums TS espelham exatamente os `STATUSES`/`DIRECTIONS` dos models. Contrato consistente.
> ⚠️ **Divergência a corrigir:** em [auth-storage.ts](../frontend/src/lib/auth-storage.ts#L4), `StoredUser` tipa `id` e `organization_id` como **`number`**, mas o backend usa **UUID (string)**. Não quebra em runtime (JSON), mas é tipo incorreto e pode enganar consumidores. (Ver §7.)

### 4.2 AuthContext + Axios + JWT

- **Token no localStorage** sob chaves namespaced `zhc.token` / `zhc.user`, acessadas **só** via [auth-storage.ts](../frontend/src/lib/auth-storage.ts). ✅
- [AuthContext.tsx](../frontend/src/contexts/AuthContext.tsx): inicializa estado lendo o storage; `login` faz `POST /api/v1/login`, persiste token+user; `logout` chama `DELETE /api/v1/logout` (best-effort, ignora erro), limpa storage e estado. `isAuthenticated = Boolean(token)`.
- [api.ts](../frontend/src/lib/api.ts): instância Axios única.
  - **Request interceptor**: injeta `Authorization: Bearer <token>` quando há token.
  - **Response interceptor 401**: ✅ implementado — `clearAuth()` + redireciona para `/login` (guardando contra loop quando já está em `/login`). Tratamento **global**, não duplicado nos chamadores.
- `baseURL` = `VITE_API_URL ?? http://localhost:23000`.

> Pendências de evolução já anotadas no CLAUDE.md do front: refresh token (hoje 401 só desloga) e theme toggle. Não bloqueiam a próxima etapa.

### 4.3 Páginas + Shadcn DataTable + TanStack Query

- **Camada de dados:** hooks dedicados `useAssets` / `useAgreements` / `useTransactions` ([hooks/](../frontend/src/hooks/)) encapsulam `useQuery` + `useMutation` (create/update/delete) com `invalidateQueries` no `onSuccess`. Query keys estáveis (`["assets"]`, etc.). ✅
- **Tabela:** [components/ui/data-table.tsx](../frontend/src/components/ui/data-table.tsx) é um wrapper genérico sobre `@tanstack/react-table` + componentes `Table` do Shadcn, com `isLoading`/`emptyState`/`loadingState` e `ColumnMeta` custom para classes de header/cell.
- **`/assets`** ([routes/_authed/assets.tsx](../frontend/src/routes/_authed/assets.tsx)): ✅ renderiza DataTable consumindo `useAssets`; colunas nome/tipo/status (Badge colorido por status)/metadata (badges das primeiras chaves primitivas)/ações. CRUD via `AssetFormDialog` + AlertDialog de exclusão + toasts (`sonner`). Estados de erro/loading tratados.
- **`/agreements`** ([routes/_authed/agreements.tsx](../frontend/src/routes/_authed/agreements.tsx)): ✅ idem; colunas cliente (nome+email)/ativo/ciclo/valor (`formatMoney`)/status/ações. `AgreementFormDialog`.
- **`/ledger`** ([routes/_authed/ledger.tsx](../frontend/src/routes/_authed/ledger.tsx)): ✅ consome `useTransactions`; direção com ícone/cor (entrada verde / saída vermelha). **Read-only no momento** (sem form de criação na página — os hooks de mutation existem mas não estão ligados a uma UI de criação).

> Observação de nomenclatura: a rota do ledger é **`/ledger`** (não `/transactions`). Não existe rota `/transactions` — a feature "transactions" é apresentada como "Ledger" na UI.

---

## 5. Cobertura e Testes (RSpec)

Comando: `RAILS_ENV=test bundle exec rspec spec/models spec/requests`

```
Finished in 3.69 seconds
94 examples, 0 failures
0 pending / 0 skipped
Randomized with seed 53580
```

### 5.1 O que está coberto
- **Request specs** (`spec/requests/api/v1/`): `assets`, `agreements`, `transactions` (novos) + `sessions`, `customers` (existentes). Cobrem caminho feliz + erros: **401** (não autenticado), **404** (registro de outro tenant → escopo por org), **422** (validação), e checagens de tenant-scoping (lista só registros da org). O spec de assets valida explicitamente a **persistência e serialização do `metadata` jsonb**.
- **Model specs** (`spec/models/`): `asset`, `agreement`, `transaction` + `payment`. O spec de `Payment` valida `belongs_to :invoice`, presença de `method`/`payment_date` e o `delegate :organization`.

### 5.2 Status — sem falhas silenciosas, com 2 ressalvas não-bloqueantes
1. **Nenhuma falha, nenhum pending/skip.** Suíte verde de verdade (94/94).
2. ⚠️ **Aviso de deprecação (não falha):** `Status code :unprocessable_entity is deprecated ... use :unprocessable_content` (Rack futuro). Cosmético; vale um find/replace nos specs/controllers antes de subir Rack major.
3. ⚠️ **Ruby de teste:** rodou em **Ruby 3.2.2** (asdf shim), enquanto o CLAUDE.md da API exige **3.3+**. Não quebrou nada, mas o `.tool-versions`/ambiente CI deve fixar a versão alvo para evitar divergência.

> Não rodei `spec/services`, `spec/policies` ou Mongoid — **não existem** (ver §6). A suíte principal pedida (models + requests) está sã.

---

## 6. Gaps Arquiteturais a Resolver Antes das Regras de Negócio Complexas

| # | Gap | Impacto | Recomendação |
|---|---|---|---|
| 1 | **`Payment` sem controller nem rota** (model + specs existem; nada em `routes.rb`) | Pagamentos não trafegam pela API; o ledger não pode ser alimentado por um fluxo de payment via HTTP | Decidir se Payment é endpoint próprio ou subordinado a Invoice (`/invoices/:id/payments`) |
| 2 | **Sem Pundit / autorização fina** | CLAUDE.md prevê `ApplicationPolicy` + `authorize`, mas o tenant é garantido apenas por **scoping** (`Current.organization.assoc`). Não há `app/policies/` | Antes de roles/admin cross-org, introduzir Pundit como combinado |
| 3 | **`Current.organization` precisa estar setado** pelo `Authenticatable` | `BaseController` só faz `include Authenticatable`; confirmar que o concern popula `Current.user/organization` por request e **reseta** entre requests (CurrentAttributes é por-thread) | Auditar o concern `Authenticatable` (fora deste relatório) e ter request spec cobrindo vazamento entre tenants |
| 4 | **`StoredUser.id`/`organization_id` tipados como `number`** no front, mas são UUID | Tipo enganoso; quebra se algum código fizer aritmética/comparação numérica | Trocar para `string` em [auth-storage.ts](../frontend/src/lib/auth-storage.ts) |
| 5 | **Contrato de API não tipado/versionado** (POROs manuais dos dois lados) | Divergência de payload é detectada só em runtime | Avaliar OpenAPI→TS (rswag + openapi-typescript) ou serializer formal |
| 6 | **Regras de fluxo ausentes** (gerar invoice por ciclo, baixar invoice em payment, lançar transaction no ledger) | É exatamente a próxima etapa; hoje só há integridade de dados | Modelar como **Services** (`app/services/`, padrão do CLAUDE.md) com specs unitários |

### 7. Pontos finos de tipagem/schema
- `transactions.date` é **`datetime`** no schema, mas o model valida como data e o front trata como `string` (ISO). Decidir se o ledger precisa de hora; se não, considerar `date`.
- `assets` não expõe timestamps no payload — ok se intencional; documentar no contrato.

---

## 8. Veredito do Tech Lead

As Etapas 1 e 2 estão **sólidas e prontas para hand-off**: schema bem modelado (UUID + money-rails consistente + `jsonb`/GIN no metadata), multi-tenant aplicado por scoping em todos os endpoints novos, invariantes cross-org validados nos models, front-end completo com TanStack Query + Shadcn DataTable nas três telas, auth JWT com interceptor 401 global, e **suíte de testes 100% verde (94/94, 0 pending)**.

O caminho para "regras de negócio complexas" está **desimpedido no nível de dados**, mas peça **três decisões arquiteturais antes de codar fluxo**: (a) estratégia de serialização/contrato (§3.1, §6.5), (b) entrada da `Pundit` (§6.2), e (c) endpoint/posição de `Payment` no ledger (§6.1). Os gaps de tipagem (§6.4, §7) são quick-wins.
