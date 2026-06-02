# ZeroHCom — Diretrizes para Claude

Este é o **CLAUDE.md raiz** do monorepo. Ele documenta o que vale para o repositório como um todo (estrutura, orquestração, infra, fluxos cross-projeto). Cada subprojeto tem o seu próprio CLAUDE.md com diretrizes específicas — sempre consulte o relevante antes de mexer naquele código:

- [api/CLAUDE.md](api/CLAUDE.md) — backend Ruby on Rails (a ser criado quando o time formalizar; até lá, consulte [api/BOOTSTRAP.md](api/BOOTSTRAP.md) e [api/README.md](api/README.md)).
- [frontend/CLAUDE.md](frontend/CLAUDE.md) — cliente React + Vite + TS + Tailwind + Shadcn + TanStack Router.

Se a tarefa toca só um subprojeto, **leia o CLAUDE.md daquele subprojeto primeiro** — ele sobrescreve qualquer convenção genérica que esteja aqui.

## Estrutura do monorepo

```
.
├── api/                  # Backend Ruby on Rails 8 (API-only, JWT)
├── frontend/             # Cliente React + Vite + TS
├── docker-compose.yml    # Postgres + Mongo (infra local)
├── Procfile.dev          # Orquestração via Foreman (api + web)
├── README.md             # Visão geral do projeto e quickstart
└── CLAUDE.md             # Este arquivo
```

## Portas e infra (dev local)

| Serviço          | Porta host | Observação |
|------------------|-----------:|------------|
| PostgreSQL       | `25432`    | container, ver `docker-compose.yml` |
| MongoDB          | `27027`    | container |
| Rails API        | `23000`    | `./api`, via `bundle exec rails s -p 23000` |
| Vite (frontend)  | `25173`    | `./frontend`, `strictPort` — CORS do Rails só libera essa porta |

Portas customizadas (não-padrão) são intencionais para evitar choque com outros projetos do mesmo workstation. Não troque sem combinar — o CORS do Rails ([api/config/initializers/cors.rb](api/config/initializers/cors.rb)) está fixado em `http://localhost:25173`.

## Comandos de orquestração

```bash
# Subir Postgres + Mongo
docker compose up -d

# Subir API + Web juntos (Foreman)
foreman start -f Procfile.dev

# Parar infra
docker compose down

# Resetar volumes (apaga dados locais)
docker compose down -v
```

Detalhes de cada subprojeto (migrate, install, testes) vivem nos respectivos READMEs/CLAUDE.md.

## Convenções cross-projeto

### Autenticação

- **JWT stateless.** Rails emite via `POST /api/v1/login`, frontend persiste em `localStorage` (`zhc.token`, `zhc.user`) e envia em `Authorization: Bearer <token>` a cada request.
- **`DELETE /api/v1/logout`** é semântico — não invalida nada server-side. Logout = limpar token no cliente.
- **401 do backend = sessão expirada/inválida.** O frontend já tem interceptor global que limpa auth e redireciona para `/login`. Não duplicar esse tratamento em controllers/handlers individuais.

### Multi-tenant

- O JWT carrega `sub` (user id) e `org` (organization id). Toda query no backend que toca dados de negócio precisa filtrar por `organization_id`. Endpoints novos: incluir `Authenticatable` e usar `current_organization`.

### Datas e fuso

- Backend retorna timestamps em ISO 8601 UTC. Frontend formata na UI conforme locale (`pt-BR` por padrão).

### Idioma

- UI em **português (pt-BR)**. Mensagens de erro voltadas ao usuário também em pt-BR.
- Comentários, nomes de variáveis/funções, commits e PRs em **inglês** (padrão de mercado para reaproveitamento e onboarding).
- Mensagens de erro de API (campo `error`) podem ser códigos em snake_case (`invalid_credentials`) — o cliente traduz para a UI.

### Git

- Trabalhe em branches feature (`feat/<slug>`, `fix/<slug>`, `chore/<slug>`).
- Commits no estilo Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- PRs com descrição em pt-BR ou inglês, com seção de "Como testar".
- **Não commitar** `.env.local`, credenciais, dumps de banco, `node_modules/`, `tmp/`, `log/`.

## Quando criar/atualizar um CLAUDE.md

- **Convenção nova que vale só para um subprojeto** → CLAUDE.md daquele subprojeto.
- **Decisão arquitetural cross-projeto** (ex.: novo formato de token, mudança de porta, novo serviço de infra) → este CLAUDE.md raiz **e** ajuste do `docker-compose.yml`/`Procfile.dev`/`README.md` quando aplicável.
- **Pegadinha encontrada na prática** (ex.: pacote X só funciona com Node 20+, gem Y precisa de var de ambiente Z) → seção "Pegadinhas conhecidas" do CLAUDE.md do subprojeto afetado.

## Sugestões de evolução do monorepo

Não bloqueantes, mas vão pagar dividendos cedo:

1. **CI no GitHub Actions** rodando, em jobs paralelos: `rspec` (api) e `tsc --noEmit` + `npm run build` (frontend). Cache de bundler e de `node_modules`.
2. **Pre-commit hook na raiz** (via `lefthook` ou `pre-commit`) que dispara o linter/format do subprojeto certo baseado nos arquivos alterados — evita commits "vermelhos".
3. **Contrato de API tipado** — gerar tipos TS do OpenAPI/Swagger do Rails (ex.: `rswag` + `openapi-typescript`) e consumir em `frontend/src/lib/api-types.ts`. Elimina divergência de payload.
4. **`.tool-versions`** (asdf) ou `.nvmrc` + `.ruby-version` na raiz, garantindo versões reproduzíveis de Node/Ruby entre máquinas e CI.
5. **Docker Compose para dev completo** (api + frontend + bancos) — opcional, mas útil para onboarding e para rodar e2e em CI sem instalar Ruby/Node.
6. **Observabilidade unificada** (Sentry / OpenTelemetry) com o mesmo `release` ID nos dois lados, para correlacionar erro de frontend com request no backend.
7. **CHANGELOG.md** raiz com decisões arquiteturais relevantes (ADRs leves) — futuro-você agradece.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
