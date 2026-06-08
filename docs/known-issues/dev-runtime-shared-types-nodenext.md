# Problema conhecido: `nest start` quebra ao resolver `@vota-comigo/shared-types`

Status: **aberto** — contornado, não corrigido. Documentado em 2026-06-08.

## Sintoma

Ao subir a API em modo de desenvolvimento (`turbo dev`, que executa `nest start --watch` em `apps/api`), o processo morre logo após o build com:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/home/.../packages/shared-types/src/proposicoes'
imported from /home/.../packages/shared-types/src/index.ts
    at finalizeResolution (node:internal/modules/esm/resolve)
    ...
    at loadESMFromCJS (node:internal/modules/cjs/loader)
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///home/.../packages/shared-types/src/proposicoes'
```

O caminho citado é sempre o primeiro re-export de `packages/shared-types/src/index.ts`.

## Causa raiz

A cadeia é:

1. `nest start` compila `apps/api/src` para CommonJS em `dist/` e executa `node dist/.../main.js`.
2. O `dist` faz `require('@vota-comigo/shared-types')`.
3. O `package.json` de `shared-types` aponta `main`/`types` para o **fonte TypeScript cru** (`./src/index.ts`), sem etapa de build:

   ```json
   { "main": "./src/index.ts", "types": "./src/index.ts" }
   ```

4. O Node 22.11 carrega esse `.ts` (faz type-stripping), vê sintaxe `export *` e o trata como **ESM**.
5. O `tsconfig` base usa `module: nodenext` / `moduleResolution: nodenext`. Sob ESM, imports relativos exigem **extensão explícita**, mas `index.ts` reexporta sem extensão:

   ```ts
   export * from './proposicoes';
   export * from './matcher';
   ```

6. A resolução ESM falha em `./proposicoes` → `ERR_MODULE_NOT_FOUND`.

### Por que outras ferramentas não quebram

- **`nest build` (tsc)** resolve o fonte de `shared-types` via path alias em tempo de compilação (resolução TS, não ESM do Node) — passa.
- **Jest (ts-jest)** transpila cada arquivo e resolve `./proposicoes` → `./proposicoes.ts` na resolução TS — passa. Os 367 testes ficam verdes.
- **Bundler do front (Next/Turbopack)** resolve imports sem extensão por conta própria — passa.

Apenas o **runtime do Node executando o `dist` CommonJS** topa com o fonte ESM sem extensão.

### Não é regressão deste slice

O re-export que quebra é `./proposicoes`, que já existia antes da issue #24. O `HEAD` tem exatamente `export * from './proposicoes';`. O problema só apareceu agora porque a API foi executada em modo dev pela primeira vez (provavelmente combinado com o Node 22.11, que passou a carregar `.ts` como ESM).

## O que foi testado

| Tentativa | Resultado |
|---|---|
| `export * from './proposicoes.js'` (extensão `.js`, idioma nodenext) | Falha em runtime: Node procura `proposicoes.js` no disco e **não** remapeia para `.ts`. `ERR_MODULE_NOT_FOUND` em `proposicoes.js`. |
| Extensão `.ts` (`export * from './proposicoes.ts'`) | Descartado sem testar: quebraria `nest build`, pois `apps/api` emite e não habilita `allowImportingTsExtensions`; o erro apareceria para todo o programa. |
| `ts-node -r tsconfig-paths/register src/main.ts` | **Funciona.** Sobe limpo, mapeia `POST /matcher`, resolve o alias para o fonte e transpila via ts-node (CommonJS). É o mesmo mecanismo que os CLIs `ingest` e `download:csvs` já usam. |

## Contorno atual (para desenvolvimento)

```bash
cd apps/api
npx ts-node -r tsconfig-paths/register src/main.ts
```

Observação operacional: sob `turbo dev`, o front (Next) ocupa a porta **3000** e a API sobe na **3001**. Os endpoints da API ficam em `http://localhost:3001`.

## Correções candidatas (a decidir no futuro)

Em ordem de robustez:

1. **Dar build ao `shared-types`** (tsc → `dist`) e apontar `main`/`types`/`exports` para o compilado.
   - Corrige o runtime do Node, mantém bundlers e testes funcionando, é o padrão de monorepo para libs TS.
   - Exige: script `build` no pacote, `exports` com `types`/`default`, e `turbo.json` com `dev` dependendo de `^build` (ou um `build:watch`).
   - Cuidado: garantir que o path alias de `apps/api` continue apontando para o fonte em tempo de tipo, para não perder DX de "ir para a definição".

2. **Trocar o script `dev` da API** para `ts-node -r tsconfig-paths/register` com watch (ou `nodemon`/`ts-node-dev`), alinhado aos CLIs existentes.
   - Mudança mínima, sem mexer no empacotamento de `shared-types`.
   - Mantém o consumo do pacote como fonte, evitando rebuilds para refletir mudanças de contrato.

Qualquer das duas resolve o bloqueio. A opção 1 é a mais correta a longo prazo; a opção 2 é a de menor atrito imediato.
