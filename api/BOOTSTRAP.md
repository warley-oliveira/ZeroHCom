# API bootstrap — comandos

Execute na **raiz do monorepo** (`/home/warley/workspace/ZeroHCom`).

## 1. Gerar a app Rails em `/api`

```bash
# Pré: ruby 3.3+ e rails 8.x instalados
gem install rails -v '~> 8.0'

# API-only, sem MiniTest (-T), sem Action Cable / Mailer (não precisamos agora)
rails new api --api -T \
  --database=postgresql \
  --skip-action-cable \
  --skip-action-mailer \
  --skip-action-mailbox \
  --skip-action-text \
  --skip-active-storage \
  --skip-jbuilder \
  --skip-bundle
```

> Após o generator, **sobrescreva** os arquivos com os contidos neste pacote
> (`config/database.yml`, `config/initializers/cors.rb`, models, controllers, etc.).

## 2. Instalar gems

Substitua o `Gemfile` gerado pelo `Gemfile` deste pacote e rode:

```bash
cd api
bundle install
```

## 3. Inicializadores

```bash
# RSpec
bin/rails generate rspec:install

# Mongoid
bin/rails generate mongoid:config
# (sobrescreva config/mongoid.yml com o deste pacote)
```

## 4. Subir banco e migrations

```bash
# garanta que docker compose up -d já está rodando (Postgres :25432, Mongo :27027)
bin/rails db:create db:migrate
RAILS_ENV=test bin/rails db:create db:migrate
```

## 5. Rodar testes

```bash
bundle exec rspec
```

## 6. Subir o servidor (via Foreman, na raiz)

```bash
cd ..
foreman start -f Procfile.dev
# API em http://localhost:23000
```
