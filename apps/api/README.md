# api

Back-end do Quem Vota Comigo (NestJS + Drizzle/Postgres). Estrutura e convenções de módulo em `CLAUDE.md`.

## Desenvolvimento

```bash
pnpm install
cp .env.example .env   # ajuste DATABASE_URL e demais variáveis
pnpm --filter api db:migrate
pnpm --filter api dev
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão Postgres. A aplicação falha no boot se ausente. |
| `PORT` | Não | Porta HTTP. Padrão `3001`. |
| `WEB_ORIGIN` | Em produção | Origem(ns) permitida(s) no CORS, separadas por vírgula. Padrão `http://localhost:3000`. Sem o domínio real, o navegador é bloqueado. |
| `OPENROUTER_API_KEY` | Só ingestão | Usada pelos CLIs de geração de resumos IA, não pelo servidor HTTP. |
| `OPENROUTER_MODEL` | Só ingestão | Modelo do OpenRouter para os resumos IA. |

As variáveis são validadas no boot por `src/shared/config/env.validation.ts`; configuração inválida derruba a aplicação com uma mensagem clara.

## Endpoints operacionais

| Rota | Uso |
| --- | --- |
| `GET /health` | Liveness: responde `200` enquanto o processo está de pé. |
| `GET /health/db` | Readiness: faz `select 1` no Postgres; `503` se o banco estiver inacessível. |

Ambas ficam fora do rate limiting (`@nestjs/throttler`, 120 req/min por IP nas demais rotas).

## Scripts

| Script | Ação |
| --- | --- |
| `pnpm --filter api dev` | Servidor em watch mode. |
| `pnpm --filter api build` | Build de produção em `dist/`. |
| `pnpm --filter api start:prod` | Executa `node dist/apps/api/src/main.js`. |
| `pnpm --filter api db:generate` | Gera migrations a partir do schema Drizzle. |
| `pnpm --filter api db:migrate` | Aplica migrations pendentes. |
| `pnpm --filter api test` | Testes (Jest). |
| `pnpm --filter api lint` | ESLint. |

## Checklist de deploy

1. Provisionar Postgres e definir `DATABASE_URL` no ambiente.
2. Definir `WEB_ORIGIN` com o domínio público do front-end (apex e `www`, se ambos forem usados).
3. Definir `PORT` se a plataforma exigir uma porta específica.
4. Build: `pnpm --filter api build`.
5. Release (antes de subir o servidor): `pnpm --filter api db:migrate`.
6. Start: `pnpm --filter api start:prod`.
7. Configurar o health check da plataforma para `GET /health` (e readiness para `GET /health/db`).
8. Servir atrás de HTTPS/proxy: o app já confia no primeiro hop (`trust proxy`) para ler IP e protocolo via `X-Forwarded-*`.
