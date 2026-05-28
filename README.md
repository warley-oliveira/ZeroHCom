# ZeroHCom

Monorepo do SaaS **ZeroHCom**.

```
.
├── api/              # Backend Ruby on Rails
├── frontend/         # Frontend React + Vite + TS + Tailwind + Shadcn
├── docker-compose.yml
└── Procfile.dev
```

## Pré-requisitos

- Docker + Docker Compose
- Ruby + Bundler (para `/api`)
- Node.js + npm (para `/frontend`)
- Foreman (`gem install foreman`)

## Portas customizadas

| Serviço         | Host    | Container |
|-----------------|---------|-----------|
| PostgreSQL      | `25432` | `5432`    |
| MongoDB         | `27027` | `27017`   |
| Rails API       | `23000` | —         |
| Vite (frontend) | `25173` | —         |

## Subir a infra (Postgres + Mongo)

```bash
docker compose up -d
```

Para parar:

```bash
docker compose down
```

Para resetar volumes (apaga os dados locais):

```bash
docker compose down -v
```

## Subir API + Web em paralelo

```bash
foreman start -f Procfile.dev
```

Isso inicia:

- `api`: `rails s -p 23000` em `./api`
- `web`: `npm run dev` (Vite na porta `25173`) em `./frontend`

## Strings de conexão (dev)

- Postgres: `postgres://zerohcom:zerohcom_dev@localhost:25432/zerohcom_development`
- Mongo:    `mongodb://zerohcom:zerohcom_dev@localhost:27027/zerohcom_development?authSource=admin`
