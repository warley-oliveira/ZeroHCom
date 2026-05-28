# ZeroHCom API — Diretrizes para Claude

Backend Ruby on Rails 8 (API-only) do monorepo ZeroHCom. **Leia [/CLAUDE.md](../CLAUDE.md) primeiro** — este arquivo cobre só convenções específicas do `/api`.

## Stack

- **Ruby** 3.3+
- **Rails** 8.1.x (API-only)
- **PostgreSQL** — store relacional primário (identidade, multi-tenant, dados de negócio)
- **MongoDB** via Mongoid — documentos/eventos/dados schemaless (use só quando o caso de uso pedir; não jogue dado relacional lá)
- **Auth:** JWT (HS256) + bcrypt (`has_secure_password`)
- **Authorization:** Pundit
- **Testes:** RSpec + FactoryBot + Shoulda + DatabaseCleaner

## Comandos diários

```bash
cd api

# subir só o backend
bundle exec rails s -p 23000

# rodar testes (sempre antes de commitar)
bundle exec rspec
bundle exec rspec spec/requests/api/v1/sessions_spec.rb  # arquivo específico

# console
bundle exec rails c

# migrations
bin/rails db:migrate
bin/rails db:rollback
RAILS_ENV=test bin/rails db:migrate

# segurança
bundle exec brakeman
bundle exec bundle-audit check --update

# lint
bundle exec rubocop
bundle exec rubocop -a   # autofix
```

A infra (Postgres :25432, Mongo :27027) sobe da raiz com `docker compose up -d`.

## Regras de ouro

### 1. **Sempre** use generators para migrations e estruturas

```bash
# CERTO
bin/rails g migration AddRoleToUsers role:string
bin/rails g model Project organization:references name:string
bin/rails g controller Api::V1::Projects

# ERRADO — escrever o arquivo de migration na mão
```

**Por quê:** timestamp consistente, naming convention correto, evita conflito de versão, gera spec stub junto. Após o generate, **edite** o arquivo gerado se precisar refinar (índices, defaults, foreign keys com `on_delete`).

Se o generator não cobrir o caso (ex: migration com SQL puro), gere uma migration vazia (`bin/rails g migration NomeDaMigration`) e edite. **Não** crie `db/migrate/*.rb` manualmente sem generator.

### 2. **Toda** nova implementação cria um teste RSpec

Antes de marcar uma tarefa como concluída:

| Tipo de código        | Teste obrigatório                                    |
|-----------------------|------------------------------------------------------|
| Endpoint HTTP         | Request spec em `spec/requests/api/v1/...`           |
| Model novo            | Model spec em `spec/models/` + factory               |
| Service / PORO        | Unit spec em `spec/services/`                        |
| Policy Pundit         | Policy spec em `spec/policies/`                      |
| Job                   | Job spec em `spec/jobs/`                             |
| Mongoid document      | Spec usando `database_cleaner-mongoid`               |

Cobertura mínima por endpoint novo: caminho feliz + pelo menos um caminho de erro (401/403/422). Não confie em "vou testar manualmente no Postman".

### 3. Multi-tenant é **invariante** de segurança

- Toda query que toca dado de negócio **deve** filtrar por `organization_id`.
- Toda controller autenticada herda de `Api::V1::BaseController` (puxa `Authenticatable` → `current_user`).
- Toda policy nova herda de `ApplicationPolicy` (que já checa `record.organization_id == user.organization_id`).
- **Nunca** exponha `Model.find(params[:id])` sem scope: use `current_user.organization.projects.find(params[:id])` ou `authorize @project` + scope na policy.

Se você precisa de uma exceção (ex: admin global cross-org), **documente no controller** e abra issue para evolução do modelo de roles.

### 4. JWT é stateless

- `POST /api/v1/login` emite token com claims `sub` (user id) e `org` (organization id).
- `DELETE /api/v1/logout` é semântico — não invalida nada server-side.
- **Não** crie sessões cookies. **Não** confunda `Authorization: Bearer` com cookies.
- Token expira em 24h (`JwtService::DEFAULT_TTL`). Quando precisar de revogação (logout efetivo, troca de senha invalidar tokens antigos), adicione `jti` + denylist (Redis ou tabela). Não esquema isso agora.

#### Pegadinha Ruby 3 — keyword vs hash

`JwtService.encode(claims, ttl: ...)` recebe `claims` como **hash posicional**:

```ruby
# CERTO
JwtService.encode({ sub: user.id, org: user.organization_id })

# ERRADO — Ruby 3 interpreta como kwargs e cai em ArgumentError
JwtService.encode(sub: user.id, org: user.organization_id)
```

Esse bug já queimou uma vez em dev. Se for adicionar um novo método que recebe um hash de dados + opções com kwargs, **sempre** chame com `{ ... }` explícito no caller.

### 5. Formato de resposta de erro

Padrão único em toda a API:

```json
{ "error": "código_em_snake_case" }
```

Códigos atuais: `invalid_credentials`, `unauthorized`, `forbidden`, `not_found`. Para erros de validação, retorne 422 com `{ "errors": { "campo": ["mensagem"] } }`. O frontend traduz códigos para pt-BR.

**Não** exponha mensagens internas (`PG::Error`, stack trace) — `ApplicationController` já tem rescues para os casos comuns; adicione novos lá, não em cada controller.

### 6. Mongoid vs ActiveRecord — quando usar qual

| Caso                                         | Store         |
|----------------------------------------------|---------------|
| Identidade, multi-tenant, billing, RBAC       | PostgreSQL    |
| Auditoria, event log, integrações externas    | MongoDB       |
| Conteúdo schemaless (settings por org, etc)   | MongoDB       |
| Relações com FK forte e queries de join       | PostgreSQL    |

Em dúvida, **comece em PostgreSQL** — relacional é mais fácil de migrar para document do que o contrário.

### 7. Naming e estrutura

- Controllers de API sempre sob `Api::V1::...` (e versionar quando quebrar contrato).
- Services em `app/services/`, nome com sufixo (`JwtService`, `BillingChargeService`), classe com `call` ou métodos de classe — escolha um padrão por service e seja consistente dentro dele.
- Policies em `app/policies/`, uma por model.
- Concerns em `app/controllers/concerns/` e `app/models/concerns/` — use com moderação, prefira POROs/services para lógica de negócio.
- Mongoid documents em `app/models/`, mesma pasta que ActiveRecord — diferenciados pelo `include Mongoid::Document`.

### 8. Migrations

- Sempre reversíveis. Use `change` quando possível; só caia para `up`/`down` quando `change` não suportar a operação.
- Toda FK precisa de índice (`add_index` ou `t.references :foo, foreign_key: true` já cria).
- Toda coluna `null: false` precisa de default ou backfill explícito na migration.
- Migrations grandes em produção: separe schema change (DDL rápido) do backfill (data migration). Não rode UPDATE massivo dentro de migration que pega lock.
- **Não** edite migration já mergeada — crie uma nova.

### 9. Idioma

- Código, identificadores, commits, PRs: **inglês**.
- Comentários técnicos: inglês (mas pt-BR é tolerado em comentários explicativos para o time, como neste arquivo).
- Mensagens de erro para o usuário final: pt-BR (no frontend; backend retorna código).

### 10. Antes de abrir PR

Checklist mental:

- [ ] `bundle exec rspec` passa local
- [ ] `bundle exec rubocop` sem erros novos
- [ ] `bundle exec brakeman` sem warnings críticos
- [ ] Migrations rodam e revertem (`db:migrate` + `db:rollback` + `db:migrate`)
- [ ] Endpoint novo coberto por request spec (caminho feliz + erro)
- [ ] Endpoint novo passa por autorização (Pundit + scoping por org)
- [ ] Nenhum `puts`, `binding.pry`, `byebug`, `TODO` órfão deixado no diff
- [ ] Nenhuma string contendo senha, token ou ID interno commitada

## Pegadinhas conhecidas

1. **Ruby 3 kwargs ≠ hash** — ver seção 4 sobre `JwtService.encode`.
2. **`rails new` sobrescreve config** — `Gemfile`, `database.yml`, `cors.rb`, `application_controller.rb`, `routes.rb` foram customizados depois do generator. Se rodar `rails new` de novo (ou um generator que mexa nesses), revise o diff antes de aceitar.
3. **Mongoid não roda em transação do ActiveRecord** — por isso `use_transactional_fixtures = false` em `rails_helper.rb` e `DatabaseCleaner` cuida da limpeza. Não troque para `:transaction` na suite Mongo.
4. **Portas customizadas** — Postgres `25432`, Mongo `27027`, Rails `23000`. Se aparecer `Connection refused`, primeiro `docker compose ps` na raiz.
5. **CORS travado em `localhost:25173`** — frontend dev precisa rodar nessa porta (Vite com `strictPort`). Para liberar outra origem, edite `CORS_ALLOWED_ORIGINS` no `.env` (lista separada por vírgula).
6. **Gemfile sem `sqlite3` / `solid_*`** — removidos intencionalmente. Quando precisar de cache/jobs persistentes, configure `solid_cache`/`solid_queue` apontando para Postgres (multi-DB), não SQLite.

## Como pedir ajuda ao Claude neste repo

Quando você (humano) ou outra instância do Claude pedir mudanças no `/api`:

- Diga **qual endpoint/model** está mexendo.
- Diga se é **feature nova**, **bug fix** ou **refactor** — afeta o que precisa de teste.
- Se for tocar autenticação, autorização ou multi-tenant, **mencione explicitamente** — esses pontos exigem revisão extra.
- Cole o erro completo, não só a primeira linha (stack trace ajuda a localizar o frame real).
