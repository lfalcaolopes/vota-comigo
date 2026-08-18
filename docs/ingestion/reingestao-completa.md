# Reingestão Completa

Roteiro para reconstruir a base do zero e publicar o resultado em produção. Siga os passos na ordem; cada um diz o que esperar antes de você seguir para o próximo.

Este é o caminho longo, para quando a base inteira precisa ser refeita. Para atualizar um ano isolado, não use este roteiro: rode o pipeline-runner com a janela do ano.

Reserve tempo. O passo 3 traz alguns gigabytes pela rede, e os passos 5 e 7 dependem da API da Câmara, que limita quantas requisições aceita por vez e obriga a repetir o mesmo comando várias vezes ao longo de horas.

## Antes de começar

- Confirme que a `DATABASE_URL` em `apps/api/.env` aponta para o Postgres local, e não para produção. O passo 1 apaga tudo sem perguntar.
- Feche o que estiver usando a base local: API, dev server, sessões de psql.
- Rode `pnpm install` se ainda não rodou.

Três avisos que valem para o roteiro inteiro:

- **Nunca apague `apps/api/data/generated/`.** São os resumos de IA, caros de refazer. Só `data/raw` e `data/logs` são descartáveis.
- **Respeite a ordem dos passos.** Vários deles dependem do anterior e, fora de ordem, não dão erro: produzem silenciosamente uma base incompleta.
- **Não publique base parcial.** Só faça o passo 10 depois que todos os anteriores tiverem fechado.

---

## 1. Apagar o banco local

```bash
docker compose down -v
pnpm db:up
pnpm db:migrate
```

Ao fim você tem um Postgres vazio com o schema aplicado.

## 2. Apagar os CSVs

```bash
rm -rf apps/api/data/raw/*
rm -rf apps/api/data/logs/gaps/*
```

## 3. Baixar os CSVs

São dois comandos, porque os arquivos da cota parlamentar ficam fora do download padrão:

```bash
pnpm download:csvs -- --from=2015 --to=2026
pnpm download:csvs -- --dataset=ceap --from=2015 --to=2026
```

Ao fim, `apps/api/data/raw/` volta a ter uma subpasta por conjunto de arquivos.

> A janela 2015 a 2026 é a usada hoje. Se você precisar de outra, troque os anos nos dois comandos e mantenha os mesmos anos no passo 4.

## 4. Ingestão principal

```bash
pnpm ingest -- --from=2015 --to=2026
```

Este comando faz o grosso do trabalho: deputados, votações, votos, proposições, temas e cota.

Duas linhas do log podem assustar e são esperadas aqui: `deputado_exercicio_intervalo` e `deputado_presenca` avisam que o histórico está ausente e pulam. Eles são retomados no passo 6.

## 5. Histórico parlamentar

```bash
pnpm ingest -- --only=deputado_historico --debug
```

Este passo busca dado na API da Câmara, que corta o acesso depois de cerca de mil consultas e volta a responder após uma pausa. **Espere ter que rodar o mesmo comando várias vezes.** Nada se perde entre as execuções: cada uma continua de onde a anterior parou, e você terminou quando o comando não encontrar mais ninguém pendente.

Se **todas** as consultas falharem já na primeira execução, pare e leia [throttling-deputado-historico.md](./throttling-deputado-historico.md); provavelmente a API está fora do ar e insistir só piora.

## 6. Recalcular o que depende do histórico

```bash
pnpm ingest -- --only=deputado_presenca,deputado_exercicio_intervalo
```

É este passo, e não o anterior, que libera o passo 7.

## 7. Reposição de passagem aérea

Necessário apenas para 2025 e 2026, porque só esses anos têm a lacuna no arquivo da Câmara.

```bash
pnpm ingest -- --only=deputado_gasto_cota_sigepa --from=2025 --to=2026 --debug
```

Como no passo 5, depende da API e precisa ser repetido até o comando reportar que nada está pendente.

Este passo também grava a categoria `998 — PASSAGEM AÉREA - SIGEPA` em `cota_categoria`. O arquivo da Câmara não traz mais essa categoria em ano nenhum, então numa base nova ela só existe se o passo rodar. Sem ela, o perfil de qualquer deputado com passagem aérea reposta responde erro em vez da página.

## 8. Fechar os cálculos e os resumos

```bash
pnpm ingest -- --only=cota_mediana_uf,deputado_cota_comparacao,sanity
```

Rode isto só depois que o passo 7 tiver fechado os dois anos: a mediana usa os valores repostos ali.

Em seguida, devolva os resumos de IA ao banco. Eles sobreviveram ao passo 1 porque ficam fora de `data/raw`:

```bash
(cd apps/api && pnpm import:resumos-ia -- data/generated/proposicao-resumos/*.json)
pnpm --filter api reconcile:resumos-ia
```

O `reconcile` é obrigatório e não gasta nada: ele marca quais resumos ficaram desatualizados em relação ao dado reingerido.

## 9. Conferir antes de publicar

```bash
docker compose exec -T postgres psql -U vota_comigo -d vota_comigo -c "
  select 'historico' t, count(*) from deputado_historico
  union all select 'exercicio', count(*) from deputado_exercicio_intervalo
  union all select 'sigepa', count(*) from deputado_gasto_cota_sigepa
  union all select 'mediana', count(*) from cota_mediana_uf
  union all select 'categoria 998', count(*) from cota_categoria where external_num_sub_cota = 998
  union all select 'resumos', count(*) from proposicao_resumo_ia;"
```

Nenhuma dessas contagens pode ser zero. Se alguma for, um passo não fechou: volte a ele.

Vale também subir a API e o site localmente e abrir um perfil de deputado, que é a página que consome quase tudo que foi ingerido.

## 10. Publicar em produção

Produção nunca ingere: ela recebe uma cópia do banco local.

```bash
# Gera a cópia
docker compose exec -T postgres pg_dump -U vota_comigo -d vota_comigo \
  --format=custom --no-owner --no-privileges \
  --exclude-table='public.matcher_completion' \
  > /tmp/vota-comigo-$(date +%F).dump

# Envia para produção
set -a; source apps/api/.env.production.local; set +a
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$DATABASE_URL" /tmp/vota-comigo-$(date +%F).dump
```

Dois cuidados neste passo:

- **`matcher_completion` fica de fora de propósito.** É a única tabela que produção escreve sozinha, e incluí-la no envio apagaria dados reais. Não remova o `--exclude-table`.
- **Use a `DATABASE_URL` de `apps/api/.env.production.local`**, que é a conexão de dono. As outras variáveis do arquivo não têm permissão para escrever.

Depois do restore, confirme que produção responde:

```bash
psql "$DATABASE_URL_APP" -c 'select count(*) from deputado'
```

Não é preciso redeployar nada: a aplicação lê o banco direto.

---

## Se algo der errado

| Situação                                                | Onde procurar                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| Download falhou ou faltou arquivo                       | [camara-csv-downloader.md](./camara-csv-downloader.md)                 |
| Dúvida sobre um passo, uma flag ou o significado do log | [pipeline-runner-ingestao.md](./pipeline-runner-ingestao.md)           |
| Passo 5 falhando em tudo, ou muito lento                | [throttling-deputado-historico.md](./throttling-deputado-historico.md) |
| Dúvida sobre a reposição do passo 7                     | [cota-passagem-aerea-sigepa.md](./cota-passagem-aerea-sigepa.md)       |
| Resumos de IA ausentes ou desatualizados                | [proposicao-resumo-ia.md](./proposicao-resumo-ia.md)                   |

Interromper qualquer passo com Ctrl-C é seguro: nenhum deles perde o que já gravou, e todos podem ser rodados de novo.
