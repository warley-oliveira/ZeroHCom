# Frontend — Diretrizes para Claude

App cliente do monorepo **ZeroHCom**. Vite + React 18 + TypeScript estrito, **Tailwind CSS v4** + **Shadcn UI v4 (preset custom `b1YmpWnGi` / style `radix-nova` / base `neutral`)**, TanStack Router file-based, Axios para HTTP. Roda na porta `25173` e consome o Rails na porta `23000`.

**Node:** 24.1.0 fixado em `.tool-versions` (asdf). Se o shell não pegar o shim, exporte `PATH="$HOME/.asdf/shims:$PATH"`.

## Comandos

| Ação | Comando |
|---|---|
| Dev server | `npm run dev` (porta `25173`, `strictPort`) |
| Type-check estrito | `npx tsc --noEmit` |
| Build de produção | `npm run build` |
| Preview do build | `npm run preview` |
| Lint | `npm run lint` |
| Tudo via Foreman | `foreman start -f Procfile.dev` (raiz) |

Variáveis de ambiente em `.env.local` (não commitar). Default em `.env.example`.

## Estrutura de pastas

```
src/
├── routes/                 # Rotas file-based do TanStack Router
│   ├── __root.tsx          # Provider tree + DevTools
│   ├── index.tsx           # Redireciona "/" baseado em token
│   ├── login.tsx           # Rota pública
│   ├── _authed.tsx         # Layout protegido + AuthGuard
│   └── _authed/            # Filhas montadas dentro do PrivateLayout
│       └── dashboard.tsx
├── routeTree.gen.ts        # AUTOGERADO pelo plugin Vite — NÃO EDITAR
├── components/
│   ├── ui/                 # Shadcn — adicione com `npx shadcn@latest add <x>`
│   └── layouts/            # PrivateLayout, AuthLayout, etc.
├── contexts/               # React Context providers (AuthContext, ThemeContext)
├── lib/                    # Utilitários puros (api, auth-storage, utils, validators)
├── hooks/                  # Hooks customizados (criar conforme necessário)
└── features/<dominio>/     # Módulos de negócio (criar conforme necessário)
```

### Convenções

- **`routeTree.gen.ts` é autogerado** pelo `@tanstack/router-plugin/vite`. Nunca edite manualmente; o plugin regrava no `npm run dev`/`build`.
- **Pathless layout routes** (prefixo `_`) agrupam rotas sob um layout sem afetar a URL. Ex.: `routes/_authed/dashboard.tsx` → `/dashboard`.
- **Componentes Shadcn em `components/ui/`** seguem o padrão da CLI v4 (functions, não `forwardRef`; `data-slot`/`data-variant` para targeting via CSS; importam de `radix-ui` umbrella, não de `@radix-ui/react-*`). Para atualizá-los: `npx shadcn@latest add <name> --overwrite`. Para reaplicar o preset inteiro: `npx shadcn@latest init --preset b1YmpWnGi --force --reinstall`. Customizações de tema vão **só** em `src/index.css` (CSS vars + `@theme inline`), nunca dentro do componente.
- **Aliases:** sempre importar com `@/...` (configurado em `tsconfig.json` + `vite.config.ts`).

## HTTP e autenticação

- **Toda chamada HTTP passa por `@/lib/api`** (instância Axios). Nunca chamar `axios` direto — perde os interceptors.
- **Token JWT só via `@/lib/auth-storage`** (`getToken`, `setToken`, `clearAuth`). Nunca ler/escrever `localStorage` direto fora desse módulo — chaves são namespaced (`zhc.token`, `zhc.user`).
- **401 é tratado globalmente:** o response interceptor limpa a auth e redireciona para `/login`. Não duplique esse tratamento nos chamadores.
- **AuthGuard:** rotas protegidas vivem sob `_authed.tsx` que usa `beforeLoad` + `redirect()` do TanStack Router para barrar requisições sem token antes de renderizar.

### Quando o backend ganhar refresh token

Estender o interceptor de response para tentar 1× um `/api/v1/refresh` antes de deslogar — usar uma promise compartilhada para evitar múltiplos refreshes simultâneos.

## Estilo e UI

- **Tema padrão: dark.** Ativado via `class="dark"` no `<html>` em `index.html`. Todas as CSS vars do tema dark estão em `src/index.css` (bloco `.dark { ... }`, valores em `oklch`). Quando for implementar o toggle de tema, remover a classe hardcoded e gerenciar via `ThemeContext` persistindo em `localStorage`. Há um `<meta name="color-scheme" content="dark">` + inline style no `<html>` para evitar flash branco no primeiro paint.
- **Tailwind v4 (sem `tailwind.config.js`).** Toda config vive em `src/index.css`: variáveis em `:root` / `.dark`, mapeamento `var(--x) → bg-x/text-x/border-x` no `@theme inline`, variant dark via `@custom-variant`. Plugin via `@tailwindcss/vite` em [vite.config.ts](vite.config.ts). Para adicionar uma cor nova: declare a CSS var nos dois blocos e adicione `--color-<nome>: var(--<nome>)` no `@theme inline`.
- **Tailwind utility-first.** Para classes condicionais, use `cn()` de `@/lib/utils` (`clsx` + `tailwind-merge`).
- **Cores via CSS vars do tema** (`bg-primary`, `text-muted-foreground`, etc.). Nunca hardcodar hex — quebra modo escuro.
- **Acessibilidade:** componentes Shadcn já são acessíveis (Radix UI por baixo). Mantenha `aria-*`, `role`, `htmlFor` corretos em forms.
- **Ícones:** o preset trouxe `@remixicon/react` (padrão novo). `lucide-react` continua instalado e em uso no `PrivateLayout` — pode coexistir, mas em código novo prefira **remixicon** para casar com o resto do preset.

## Internacionalização (i18n)

**Regra obrigatória: todo texto visível ao usuário passa por i18n.** Qualquer alteração no frontend que adicione ou altere texto de UI **deve** usar `react-i18next` — nunca hardcode string (pt-BR ou en) em JSX, `aria-label`, `placeholder`, título/descrição de diálogo, `toast`, header de tabela, estado de loading/erro/vazio ou label de opção. Texto de UI solto = mudança incompleta.

### Como usar

- Em componentes: `const { t } = useTranslation()` e renderize com `t("namespace.chave")`.
- Interpolação: `t("ns.greeting", { name })` com o valor `"Olá, {{name}}"` no locale.
- Em módulos **não-componentes** (`*.ts`, helpers): **não chame hooks** — receba `t: TFunction` (de `i18next`) por parâmetro (ex.: `buildCashflowChartConfig(t)` em [src/components/dashboard/dashboard-config.ts](src/components/dashboard/dashboard-config.ts)).
- Chave dinâmica por enum: `` t(`invoices.methods.${method}`) `` — garanta que **todos** os valores possíveis existam no locale. **Nunca** traduza o id/enum de lógica em si (`"stripe"`, `"active"`, `"weekly"`), só o label exibido. Datas/números via `Intl`/`formatMoney`/`formatDate` não são i18n de texto.

### Onde ficam as traduções

- Config: [src/i18n/index.ts](src/i18n/index.ts). Idioma detectado do navegador (`localStorage` → `navigator`) e persistido em `localStorage` (`zhc.lang`). Recursos chaveados por **língua base** (`pt` / `en`) com `load: "languageOnly"` — variantes regionais (`pt-BR`, `en-US`) colapsam na base. **`fallbackLng` é `en`** (idioma/chave ausente cai para inglês).
- Recursos: [src/i18n/locales/pt-BR.ts](src/i18n/locales/pt-BR.ts) e [src/i18n/locales/en.ts](src/i18n/locales/en.ts), agrupados por namespace de feature (`common`, `nav`, `invoices`, `agreements`, `portal`, …). Ações genéricas (salvar, cancelar, excluir, recarregar…) ficam em `common.*` — **reutilize, não duplique**.
- **As duas línguas andam juntas:** toda chave nova entra em pt-BR **e** en no mesmo commit (mesma estrutura de chaves; só os valores mudam). Como `en` é o fallback, nenhuma chave pode faltar lá.
- Seletor de idioma: [src/components/LanguageSwitcher.tsx](src/components/LanguageSwitcher.tsx), no header autenticado e no portal público. Novo idioma → adicione em `SUPPORTED_LANGUAGES` ([src/i18n/index.ts](src/i18n/index.ts)) e crie o locale correspondente.

### Verificação (antes de concluir qualquer mudança de UI)

```bash
node scripts/i18n-check.mjs   # falha se chave usada no código não existir nos 2 locales, ou houver chave órfã/desbalanceada
npx tsc --noEmit && pnpm lint
```

## TypeScript

- **Strict mode + `noUnusedLocals` + `noUnusedParameters`** ligados.
- Sem `any`. Prefira `unknown` + narrowing, ou tipos explícitos.
- Tipos de payload de API ficam próximos do uso (ex.: `LoginResponse` dentro do `AuthContext`). Quando reutilizar entre arquivos, mover para `src/lib/types/` (criar quando precisar).

## Performance

- `defaultPreload: "intent"` no router pré-carrega rotas no hover/focus dos `<Link>`.
- Para listagens pesadas: usar `@tanstack/react-virtual` (instalar quando necessário).
- Code-splitting: rotas file-based do TanStack já são lazy-loaded por padrão.

## Sugestões de evolução (não bloqueantes)

Adicionar conforme o produto pedir, na ordem aproximada de retorno:

1. **TanStack Query** (`@tanstack/react-query`) — cache, deduplicação, retry, estados de loading/error em chamadas server-side. Substitui a maior parte dos `useState + useEffect` de fetching.
2. **React Hook Form + Zod** (`react-hook-form`, `zod`, `@hookform/resolvers`) — formulários validados com tipos derivados do schema. Para o LoginPage e qualquer form acima de 2 campos.
3. **Sonner** (`sonner`) — toasts de feedback (sucesso/erro de mutations) com bom DX.
4. **Prettier + plugin do Tailwind** (`prettier`, `prettier-plugin-tailwindcss`) — ordenação automática de classes. Já há ESLint do template Vite; integre lado a lado.
5. **Husky + lint-staged** rodando `tsc --noEmit`, `eslint --fix` e `prettier --write` no pre-commit. Evita PRs vermelhos por bobagem.
6. **Refresh token + retry no interceptor** — quando o backend expor `/refresh`. Hoje o 401 só desloga.
7. **Theme toggle (light/dark)** — todos os CSS vars já estão prontos em `src/index.css` (`.dark` class). Falta um `ThemeContext` + botão de toggle persistindo a preferência em `localStorage`.
8. ~~**i18n**~~ — **implementado** (pt-BR + en, fallback `en`). Virou **regra obrigatória**: ver a seção [Internacionalização (i18n)](#internacionalização-i18n) acima.
9. **Vitest + Testing Library** (unitário) e **Playwright** (e2e contra `foreman start`).
10. **Sentry** ou similar — observabilidade de erros no client. Integrar no interceptor de response e em um `ErrorBoundary` no `__root`.
11. **CSP / security headers** — em produção, configurar no host (Nginx/Cloudflare). LocalStorage para JWT é OK para SaaS interno; se evoluir para B2C público com risco de XSS, mover para cookie `HttpOnly` + endpoint de refresh.

## Pegadinhas conhecidas

- **Use o Node do asdf**, não o do sistema. A máquina tem um `/usr/bin/node` (v18.17) que vence pelo PATH em shells novos — isso quebra `npx shadcn`, `@tailwindcss/vite` e a CLI moderna do TanStack. Garanta que `which node` aponte para `~/.asdf/shims/node` (`24.1.0`). Em scripts não-interativos, prefixe `PATH="$HOME/.asdf/shims:$PATH"`.
- **TanStack Router ainda pinado em 1.95.x via `overrides`** no `package.json`. Foi necessário no Node 18; com Node 24 dá pra atualizar (remover o bloco `overrides`, instalar `@tanstack/react-router@latest` + `@tanstack/router-plugin@latest` + `@tanstack/router-devtools@latest` e trocar `TanStackRouterVite()` por `tanstackRouter({ target: "react", autoCodeSplitting: true })` em [vite.config.ts](vite.config.ts)).
- **Linter PostCSS do VSCode** acusa `Unknown at rule @theme`, `@apply`, `@custom-variant`. São sintaxes do Tailwind v4 que o linter default não conhece — funcionam em build. Instale a extensão oficial **Tailwind CSS IntelliSense** para silenciar.
- **Não editar `tailwind.config.js`** — ele foi removido na migração v4. Toda config está em `src/index.css`.
- **Não importar `routeTree.gen.ts` manualmente** em código de feature — só `main.tsx` precisa.
- **`strictPort: true`** faz o Vite falhar se 25173 estiver ocupada (em vez de cair para a próxima). É proposital — manter a porta canônica do CORS.
- **Componentes Shadcn v4 precisam de `forwardRef` neste projeto.** A CLI gera componentes como função sem `forwardRef` (estilo React 19, ref-as-prop). Como rodamos **React 18**, o `ref` é **descartado silenciosamente** — isso quebra o `register` do react-hook-form (campo vem `undefined`, form de edição abre vazio) e a composição do Radix (triggers via `asChild`). Ao rodar `npx shadcn add <x>` ou escrever um primitivo novo, **converta para `React.forwardRef` + `displayName`** todo componente que hospeda um nó DOM ou é trigger/anchor Radix (ver [src/components/ui/input.tsx](src/components/ui/input.tsx) como padrão). Já convertidos: `input`, `textarea`, `skeleton`, `separator`, `chart`, `button`, `tabs`. Sintoma clássico de esquecer: um `DropdownMenu`/`Popover` com `<Trigger asChild><Button>` **não abre** (o popper precisa do ref do trigger para ancorar) — foi o que derrubou o `LanguageSwitcher` até o `button` virar `forwardRef`.
- **Use `pnpm`, não `npm`.** O `packageManager` é `pnpm@11.4.0` e a fonte de verdade é o `pnpm-lock.yaml`. Qualquer `npm install` (inclusive o que a CLI do `shadcn` dispara internamente) falha com **`EOVERRIDE`** por causa do bloco `overrides` do TanStack Router. Para adicionar dependência: `pnpm add <pkg>`. Para primitivos Shadcn, prefira **escrevê-los à mão** (já precisam do `forwardRef` de qualquer forma) em vez de rodar a CLI.
