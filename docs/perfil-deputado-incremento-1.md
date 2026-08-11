# Perfil do deputado — incremento 1: proposições assinadas, órgãos e discursos

Consolida e substitui `perfil-deputado-primeiro-incremento.md`,
`perfil-deputado-proposicoes-autoria.md` e `perfil-deputado-orgaos-discursos.md`.
Gastos da cota parlamentar saíram para `perfil-deputado-incremento-2.md`.

## Escopo

Três seções novas no **Perfil do deputado**, todas recortadas por um ano
selecionado:

- **Proposições assinadas** pelo deputado;
- **Comissões e outros órgãos**;
- **Discursos**.

Fora de escopo: votos individuais, transcrição de discursos, resumo por IA,
detalhe de evento, relatoria, papel de proponente ou apoiador, Mesa Diretora,
lideranças, frentes parlamentares, e qualquer métrica comparativa ou ranking
derivado das três seções.

## Decisão de integração

As três seções consultam a API de Dados Abertos da Câmara **em runtime**, sob
demanda, sempre pelo backend. Nenhuma delas passa pela ingestão.

Isso reabre `CONTEXT.md`, cuja regra anterior dizia que o perfil não buscava
dados em runtime na fonte. A regra foi reescrita: o que permanece invariante é
que o navegador nunca fala com a Câmara, que os blocos de identidade não
dependem da fonte externa, e que uma seção externa falha isoladamente.

**Não há cache no servidor.** A API é um proxy que valida e transforma. O cache
vive no cliente: `Cache-Control` nos endpoints novos resolve navegação e reload,
e o estado por ano dentro da seção resolve a troca de ano sem refetch.

O motivo é o deploy. Cloud Run roda com `--min-instances=0`, então cache em
memória tem taxa de acerto próxima de zero entre visitas. O único cache
persistente possível seria uma tabela no Neon, o que exigiria dar escrita ao
role `app_ro` — hoje somente leitura, com a única exceção de
`matcher_completion`. E com cerca de 10 mil pares `(deputado, year)` e tráfego
baixo, o acerto entre usuários seria ruim de qualquer forma. O cache de servidor
custaria caro e compraria pouco; a interação que realmente se repete é o mesmo
usuário trocando o ano do mesmo deputado, que o cliente resolve melhor.

Consequência aceita: sem stale-on-error. Câmara indisponível significa a seção
afetada exibindo seu estado de falha, com o resto do perfil de pé.

## Modelo de ano

O parâmetro público é `year`, não `ano`. Além da ADR 007 (palavra genérica em
inglês), a fonte tem um campo chamado `ano` — o ano legislativo — que este
recorte explicitamente rejeita em favor de `dataApresentacao`. Usar `ano`
colidiria com um campo da fonte que significa outra coisa.

Um único `year` vale para as três seções, preservado na URL:

```text
/deputados/{externalIdDeputado}?year={year}
```

Default e faixa derivam de campos que `DeputadoPerfil` já carrega:

```text
default = min(anoCorrente, year(legislaturaFinalPeriodo.dataFim))
faixa   = year(legislaturaInicialPeriodo.dataInicio) .. default
```

Deputado em exercício cai no ano corrente, porque o fim da legislatura atual é
futuro e o `min` corta. Ex-deputado abre no último ano de mandato, com dados —
em vez de abrir no ano corrente e exibir três seções vazias.

A faixa é frouxa de propósito: um suplente que assumiu no meio da legislatura
recebe a legislatura inteira, e alguns anos oferecidos vêm vazios. Os intervalos
exatos existem em `deputado_exercicio_intervalo`, mas não estão no contrato do
perfil. Oferecer um ano vazio é erro recuperável; esconder um ano com dados não
é.

O backend valida `year` contra essa faixa. Fora dela é erro de entrada, sem
chamar a Câmara.

O cabeçalho continua sendo o **Snapshot público do deputado** mais recente e não
muda com o ano. O partido daquele ano já está na seção de histórico partidário
da própria página; não se duplica essa informação. O seletor de ano deve ficar
visualmente agrupado com as seções que ele controla, separado do bloco de
identidade.

## Proposições assinadas

### Semântica pública

Entra toda proposição em que a Câmara registra o deputado como signatário, com
`dataApresentacao` dentro do ano. Pelo Regimento Interno, todo signatário é
autor — proponentes e apoiadores. A rota de busca não informa o papel nem a
ordem de assinatura, então o conjunto **não distingue quem propôs de quem
apoiou**.

Título público: `Proposições assinadas`. Texto de apoio: `Proposições em que o
deputado consta como signatário na Câmara, como proponente ou apoiador.`

Não usar: "Proposições de autoria", "Proposições criadas", "Proposições que
apresentou", "Projetos criados pelo deputado", "Iniciativas do deputado". Todos
atribuem iniciativa individual que a fonte escolhida não demonstra.

O contador aparece sempre colado ao rótulo ("13 proposições assinadas em 2022"),
nunca como número solto, badge ou métrica ao lado do título. A quantidade não é
medida de produtividade e não sustenta comparação entre deputados.

### Fonte

```text
GET https://dadosabertos.camara.leg.br/api/v2/proposicoes
    ?idDeputadoAutor={externalIdDeputado}
    &dataApresentacaoInicio={inicio}
    &dataApresentacaoFim={fim}
    &itens=100
    &ordem=ASC
    &ordenarPor=id
```

A API rejeita intervalos maiores que três meses, então o ano vira quatro
consultas trimestrais sem sobreposição (`01-01..03-31`, `04-01..06-30`,
`07-01..09-30`, `10-01..12-31`), com concorrência limitada. Cada trimestre pode
exigir mais de uma página; quatro chamadas é o piso, não garantia.

O recorte usa `dataApresentacao`, não o campo `ano`. Na investigação,
`ano=2022` devolveu 7 proposições e o intervalo por `dataApresentacao` devolveu
13 — seis delas têm `ano = 0`, valor legítimo para tipos como requerimento e
emenda.

### Algoritmo

1. Validar `externalIdDeputado` e `year` contra a faixa do deputado.
2. Confirmar que o deputado existe no produto; inexistência retorna `404` sem
   consultar a Câmara.
3. Consultar os quatro trimestres, seguindo `rel = next` em cada um.
4. Concatenar, validar cada item, remover duplicidades por `id`.
5. Rejeitar item cuja `dataApresentacao` esteja fora do ano solicitado; é erro
   de fonte, não item a incluir silenciosamente.
6. Ordenar por `dataApresentacao desc`, empate por `id desc`.
7. Derivar a página oficial da Câmara a partir de `id`, sem nova chamada.

Falha de qualquer trimestre ou página derruba a seção inteira. Não se devolve
resultado parcial como se fosse o ano completo.

## Comissões e outros órgãos

Mostra vínculos formais do deputado com órgãos da Câmara no ano. Comissão é um
tipo de órgão na fonte.

O registro demonstra o órgão, o título registrado pela Câmara (Presidente,
Titular, Suplente) e o período do vínculo. Não demonstra presença em reuniões,
contribuições, relatoria, produtividade nem concordância com decisões do órgão.
Não usar rótulos comparativos.

```text
GET /deputados/{id}/orgaos?dataInicio={year}-01-01&dataFim={year}-12-31
    &itens=100&ordem=ASC&ordenarPor=dataInicio
```

Campos usados, com a grafia da fonte preservada: `idOrgao`, `uriOrgao`,
`siglaOrgao`, `nomeOrgao`, `nomePublicacao`, `titulo`, `codTitulo`,
`dataInicio`, `dataFim`.

Um mesmo órgão aparecendo várias vezes com cargos ou períodos diferentes **não
é duplicidade** — esses registros são preservados e agrupados visualmente por
órgão, sem fundir períodos. O nome público usa `nomePublicacao`, com fallback
para `nomeOrgao`.

Ordem de apresentação: cargos de direção (Presidente, Vice-Presidente), depois
demais cargos de direção, Titular, Suplente, e por fim os títulos
desconhecidos — que não são descartados e aparecem com o texto oficial da
Câmara. Dentro de cada grupo, `dataInicio desc`, `nomePublicacao asc`,
`idOrgao asc`. A classificação é regra explícita e testada.

Item sem identificador, nome, título ou data inicial válidos é rejeitado.

## Discursos

Apresenta pronunciamentos registrados pela Câmara no ano, com contexto vindo do
sumário e dos assuntos da fonte. Não demonstra posição permanente sobre um
assunto, autoria de proposição mencionada, participação no evento completo,
importância relativa nem produtividade por quantidade.

```text
GET /deputados/{id}/discursos?dataInicio={year}-01-01&dataFim={year}-12-31
    &itens=100&ordem=DESC&ordenarPor=dataHoraInicio
```

### Transcrição nunca sai do backend

Não há parâmetro que exclua `transcricao` da resposta da Câmara. A integração
paga a transferência, mas o campo morre no backend, por construção:

1. o schema externo valida `transcricao` como string opcional;
2. a transformação monta um objeto novo por lista explícita de campos públicos,
   sem copiar o campo;
3. o schema de `@vota-comigo/shared-types` não declara `transcricao`;
4. logs não registram corpos completos da Câmara;
5. teste de contrato verifica a ausência mesmo com o campo presente no fixture.

Na amostra de Nikolas Ferreira em 2025, 54 discursos somaram ~216 KB brutos,
dos quais ~146 mil caracteres eram transcrição. Sem ela, o payload cabe
tranquilamente numa resposta anual única.

### Descrição, assuntos e links

`sumario` é a descrição oficial; o backend normaliza apenas espaços e quebras de
linha, sem reescrever ou resumir. O contrato preserva o sumário completo; a
interface deriva uma prévia de até 280 caracteres, encerrando em limite de frase
ou palavra, com controle inline `aria-expanded` para revelar o texto completo. O
conteúdo recolhido fica fora da árvore de acessibilidade até a expansão. Não há
resumo por IA.

Assuntos derivam de `keywords` deterministicamente: dividir por vírgulas e
quebras de linha, aparar espaços, descartar vazios, deduplicar ignorando
capitalização, preservando a primeira grafia e a ordem da fonte. Rótulo:
`Assuntos informados pela Câmara` — não é classificação editorial do produto.

`faseEvento.titulo` é exibido como fase ("Ordem do Dia", "Breves Comunicações"),
nunca como nome do evento. O nome completo exigiria `GET /eventos/{id}`, que não
é chamado: `uriEvento` estava vazio nas duas amostras e a fase basta.
`uriEvento` não entra no contrato.

Links, nesta ordem, quando existirem: `urlVideo` ("Assistir discurso na
Câmara"), `urlAudio` ("Ouvir discurso na Câmara"), `urlTexto` ("Ler discurso na
Câmara"). Sem link disponível, o item não recebe URL sintética. Links são
validados como URLs externas, abrem em nova aba com `rel="noreferrer"` e têm
texto compreensível fora de contexto.

Item sem sumário não é erro se tiver data e algum contexto ou link. Ausência de
fase não gera rótulo vazio nem "evento desconhecido".

## Contrato público

Três endpoints independentes, um por seção:

```text
GET /deputados/{externalIdDeputado}/proposicoes-assinadas?year={year}
GET /deputados/{externalIdDeputado}/orgaos?year={year}
GET /deputados/{externalIdDeputado}/discursos?year={year}
```

**Sem `limit` e `offset`.** Cada resposta devolve o ano inteiro. Paginação de
servidor só faria sentido com o conjunto anual em cache no backend; sem cache,
pedir a página 2 refaria as quatro consultas trimestrais à Câmara. Com os
volumes observados (9 órgãos, 13 proposições, 54 discursos) o ano inteiro é
payload pequeno, e "ver mais" no cliente é instantâneo.

Forma da resposta:

```json
{
  "year": 2022,
  "items": [],
  "total": 0
}
```

`total` é `items.length`, mantido por conveniência de renderização.

Ano válido sem resultados devolve `200` com `items` vazio. Deputado inexistente
devolve `404`. Ano fora da faixa devolve erro de entrada. Item externo inválido
nunca vira registro sintético.

Schemas Zod e tipos públicos existem uma única vez em
`@vota-comigo/shared-types`. Proposições assinadas não reutiliza
`ProposicaoCard`: o card do feed representa proposições computáveis e carrega
métricas de votação que não pertencem a esta seção.

## Frontend

O bloco de identidade — nome, snapshot público, resumo de presença, histórico
partidário — continua **server-rendered** a partir do Postgres, como hoje. As
três seções novas são **client components** que buscam pela API, no padrão já
usado pelo feed de deputados (`apiGet`, reducer, `feed-url.ts`,
`use-deputado-feed-state.ts`).

Isso não é preferência de estilo. Um server component que aguarda as chamadas à
Câmara encosta no teto de duração de função da Vercel e faz o Cloud Run faturar
tempo de parede pela latência da fonte. Buscar no cliente também entrega de
graça o skeleton local, a falha isolada por seção e o cache por ano.

Trocar o ano é mudança de estado com sync de URL, não navegação — o cabeçalho
não re-renderiza e as seções já visitadas não refazem chamada.

Aceite consciente: as três seções não são indexáveis por buscadores. Identidade,
presença e histórico continuam SSR, então o SEO do perfil não regride.

### Estados

Cada seção tem os três estados, isolados:

- **Carregando:** skeleton local com altura próxima ao conteúdo, sem alterar o
  resto do perfil.
- **Sem dados:** `Não há {proposições assinadas | cargos ou participações em
  órgãos | discursos} disponíveis para este ano.`
- **Falha:** `Não foi possível carregar {as proposições assinadas | os órgãos e
  cargos | os discursos} agora.`

Falha de uma seção não afeta as outras nem o bloco de identidade.

## Resiliência e limites

- **Timeout curto e próprio.** `DEFAULT_TIMEOUT_MS = 50_000` do transport foi
  calibrado para ingestão, onde esperar é aceitável. Em requisição de página, um
  balde de tokens esvaziado faz a chamada travar por dezenas de segundos. Os
  endpoints de runtime usam timeout de poucos segundos: falha rápido, mostra o
  estado escrito, e não queima tempo faturado no Cloud Run.
- **Throttle apertado nos três endpoints de proxy.** `@Throttle` sobrescrevendo
  o global de 120 req/min, que foi dimensionado para uma API que só lia o
  Postgres. Cada requisição de proposições assinadas vira até quatro chamadas
  externas.
- **Validação antes de sair.** Deputado inexistente e `year` fora da faixa são
  rejeitados sem tocar na Câmara, o que também reduz o espaço enumerável.
- Retry limitado apenas para falhas transitórias.

Teto global de saída para a Câmara foi considerado e descartado: o throttling
observado na ingestão é balde que reenche sozinho, sem bloqueio permanente de
IP, e o pior caso é latência durante o abuso — coberto pelo estado de falha.

## Observabilidade

Por consulta anual e seção: deputado e ano, quantidade de páginas externas,
itens recebidos e transformados, duração, tamanho aproximado da resposta de
discursos, discursos sem sumário/assuntos/link, timeout, rate limit e erro de
validação. Nunca registrar transcrições, corpos completos ou URLs com query
strings imprevisíveis.

## Testes

Unitários não acessam rede, banco real ou outros módulos; AAA explícito;
agrupados por cenário.

**Ano:** default para deputado em exercício e para ex-deputado; faixa derivada
dos períodos de legislatura; `year` fora da faixa rejeitado sem chamada externa.

**Proposições assinadas:** quatro trimestres sem sobreposição; ano bissexto sem
alterar os limites; paginação por `rel = next`; união e deduplicação por `id`;
item com `ano = 0` e `dataApresentacao` no ano incluído; item fora do recorte
rejeitado; ordenação determinística; trimestre vazio; ano vazio; falha de um
trimestre sem retorno parcial.

**Órgãos:** uma e múltiplas páginas; vários cargos no mesmo órgão preservados;
períodos simultâneos preservados; Presidente, Titular, Suplente e título
desconhecido; ordenação determinística; item inválido rejeitado; falha em página
intermediária sem resposta parcial.

**Discursos:** transcrição presente no fixture e ausente no contrato; sumário
ausente; assuntos ausentes; normalização e deduplicação de `keywords`; fase
ausente; `uriEvento` vazio sem chamada adicional; links opcionais; nenhum link
sem URL sintética; falha em página intermediária sem resposta parcial.

**Contrato:** as três respostas validadas pelos schemas de
`@vota-comigo/shared-types`; `transcricao` ausente; `limit`/`offset` inexistentes.

**Interface:** troca de ano preservada na URL sem re-render do cabeçalho; seção
já visitada não refaz chamada ao voltar para o ano; agrupamento por órgão;
expansão do sumário por teclado e toque; ausência de transcrição no DOM; estados
isolados; links externos com rótulo completo; leitura mobile sem rolagem
horizontal; foco visível.

## Critérios de aceite

- O navegador nunca chama a Câmara diretamente.
- Falha externa afeta apenas a seção correspondente; identidade, presença e
  histórico partidário continuam de pé.
- O recorte anual usa `dataApresentacao`, não `ano`; a amostra de Aécio Neves em
  2022 devolve 13.
- O ano fica na URL como `year`, com default e faixa derivados dos períodos de
  legislatura.
- Nenhuma resposta contém `limit`, `offset` ou paginação de servidor.
- O texto público não atribui iniciativa individual ao deputado, e a contagem
  aparece sempre junto ao rótulo.
- Órgãos distintos e mudanças de cargo aparecem sem inferência de produtividade.
- `transcricao` não aparece em contrato, logs, resposta ou DOM.
- Os endpoints de proxy têm throttle próprio e timeout curto.
- Tipos compartilhados existem uma única vez em `@vota-comigo/shared-types`.

## Sequência de implementação

1. schemas externo e público em `@vota-comigo/shared-types`;
2. cliente paginado da Câmara com timeout próprio, reusando o transport
   existente;
3. divisão trimestral, união, validação, deduplicação, ordenação e link oficial
   das proposições assinadas;
4. transformação de órgãos, com a classificação de cargos testada;
5. transformação de discursos, com a exclusão de `transcricao` por construção;
6. serviço, controller e throttle dos três endpoints;
7. `year` no estado da URL do perfil, com default e faixa;
8. as três seções no cliente, com cache por ano e estados isolados;
9. observabilidade;
10. validação da amostra e dos critérios de aceite.

## Apêndice: evidência da investigação

Amostra principal: Aécio Neves (`idDeputado = 74646`), 2022. Investigado em
10 de agosto de 2026.

**Proposições, por critério:**

| Critério                                                    | Quantidade |
| ----------------------------------------------------------- | ---------: |
| API com `ano=2022`                                          |          7 |
| API com `dataApresentacao` em 2022                          |         13 |
| API de autores com `proponente = 1`                         |         11 |
| API de autores com `proponente = 1` e `ordemAssinatura = 1` |          9 |
| `proposicoesAutores-2022.csv`, vínculos                     |         13 |
| `proposicoesAutores-2022.csv`, com `proponente = 1`         |         12 |
| Portal da Câmara, "de sua autoria"                          |         12 |

O contador do portal não é reproduzível pela rota pública de busca. O CSV de
autoria reproduz (12) e traria `proponente` e `ordemAssinatura`, mas exigiria um
passo de ingestão; a decisão foi ficar na API e publicar o conjunto amplo, com o
rótulo ajustado para não prometer iniciativa.

Proposições com `dataApresentacao` em 2022 e `ano = 0`: `2314275` (PRLP),
`2314276` (PPP), `2314280` (PPP), `2314871` (RDF), `2327419` (EMP), `2327420`
(EMP).

**Órgãos:** a rota devolveu nove vínculos em página única, com condições de
Titular, Suplente e Presidente, incluindo o mesmo órgão em cargos e períodos
distintos.

**Discursos:**

| Amostra                | Itens | Com sumário | Com palavras-chave | Com `uriEvento` | Com texto | Com áudio ou vídeo |
| ---------------------- | ----: | ----------: | -----------------: | --------------: | --------: | -----------------: |
| Aécio Neves, 2022      |     5 |           5 |                  5 |               0 |         5 |                  0 |
| Nikolas Ferreira, 2025 |    54 |          52 |                 52 |               0 |        49 |                  0 |

Sumários têm mediana próxima de 600 caracteres, alguns passando de mil — não se
deve presumir sumário curto.

**Despesas:** `GET /deputados/74646/despesas?ano={ano}` devolveu lista vazia em
todos os anos testados entre 2019 e 2026, enquanto `Ano-2022.csv.zip` continha
registros com `ideCadastro = 74646`. É por isso que a cota parlamentar não tem
caminho de runtime e virou o incremento 2, por ingestão.

## Fontes oficiais

- [Documentação da API Dados Abertos](https://dadosabertos.camara.leg.br/swagger/api.html?tab=api)
- [Especificação OpenAPI](https://dadosabertos.camara.leg.br/api/v2/api-docs)
- [Paginação da API Dados Abertos](https://dadosabertos.camara.leg.br/howtouse/2017-05-16-js-resultados-paginados.html)
- [Regimento Interno da Câmara](https://www2.camara.leg.br/atividade-legislativa/legislacao/regimento-interno-da-camara-dos-deputados/arquivos-1/RICDatualizadoatRCD342026.pdf/view)
- [Perfil oficial de Aécio Neves em 2022](https://www.camara.leg.br/deputados/74646?ano=2022)
