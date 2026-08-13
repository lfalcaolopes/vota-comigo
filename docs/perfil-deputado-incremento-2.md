# Perfil do deputado — incremento 2: gastos da cota parlamentar

## Objetivo

Definir a implementação da visualização agregada das despesas da Cota para o Exercício da Atividade Parlamentar (CEAP) no **Perfil do deputado**.

Este é o segundo incremento do perfil. O primeiro — proposições assinadas, órgãos e discursos — está em [`perfil-deputado-incremento-1.md`](./perfil-deputado-incremento-1.md) e usa consulta à API da Câmara em runtime, sem ingestão.

Esta seção segue o caminho oposto, **por ingestão**, e a razão não é preferência: a CEAP não tem caminho de runtime. `GET /deputados/{id}/despesas` devolveu lista vazia para a amostra investigada em todos os anos testados entre 2019 e 2026, enquanto o arquivo anual continha os registros normalmente. Só o arquivo serve como fonte.

Os dois incrementos compartilham o modelo de ano definido no incremento 1: parâmetro `year` na URL, um único ano para todas as seções, com default e faixa derivados dos períodos de legislatura já presentes em `DeputadoPerfil`. A faixa efetiva desta seção é a interseção daquela faixa com os anos em que existe arquivo da CEAP.

O usuário seleciona um ano e visualiza:

- o total utilizado da cota no ano;
- a distribuição anual entre as cinco maiores categorias e **Outras despesas**;
- os totais mensais do ano, separados pelas mesmas categorias.

O ano selecionado é preservado na URL. Não há seleção de mês: os doze meses são sempre apresentados.

## Fora de escopo

Este incremento não exibe:

- despesas individuais;
- fornecedores;
- documentos fiscais;
- comprovantes;
- CPF ou CNPJ;
- glosas e restituições como métricas separadas;
- percentual da cota disponível que foi utilizado;
- valor restante ou não utilizado da cota;
- ranking de fornecedores;
- confronto nominal de gastos entre deputados.

A **mediana da UF** definida em [Contexto do total](#contexto-do-total) não é confronto nominal: é agregado estatístico sobre um estado inteiro, não expõe nenhum deputado individualmente e não produz ranking. A fronteira é essa — comparar contra uma distribuição é permitido; comparar contra uma pessoa nomeada, não.

O percentual utilizado e o saldo da cota exigem o teto disponível para cada deputado e período. Ele existe e é oficial — fixado pelo Ato da Mesa 43/2009, Anexo Único, alterado por atos posteriores —, mas **não é obtível como série histórica**: não há endpoint, CSV nem arquivo no Dados Abertos, e reconstruir os valores de 2008 em diante exigiria rastrear à mão a cadeia de atos que alteraram o Anexo ao longo de 17 anos. Como o seletor de ano cobre muitos anos, um denominador presente em 2024 e ausente em 2012 produziria uma feature intermitente, pior que a ausência. Fica como evolução futura.

## Fonte

A fonte canônica é o arquivo anual da Câmara dos Deputados:

```text
https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip
```

Os arquivos existem desde 2008 e usam:

- arquivo ZIP;
- CSV codificado em UTF-8 com BOM;
- separador `;`;
- nomes de campos próprios da CEAP, diferentes dos demais conjuntos do Dados Abertos.

Referências oficiais:

- [Catálogo de arquivos da Câmara](https://dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile)
- [Significado dos campos da CEAP](https://dadosabertos.camara.leg.br/howtouse/2023-12-26-dados-ceap.html)

O arquivo analisado nesta investigação foi `csv/Ano-2025.csv`, com 208.240 registros CSV e 32 campos.

## Campos usados

| Campo da fonte   | Uso                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------- |
| `ideCadastro`    | Identificador do deputado usado para resolver a FK interna `deputado_id`.              |
| `numSubCota`     | Código oficial da categoria da despesa.                                                |
| `txtDescricao`   | Descrição oficial da categoria.                                                        |
| `vlrLiquido`     | Valor efetivamente debitado da cota antes de eventual restituição posterior.           |
| `vlrRestituicao` | Valor posteriormente devolvido à Câmara. Campo vazio equivale a zero para a agregação. |
| `numMes`         | Mês de competência financeira da despesa.                                              |
| `numAno`         | Ano de competência financeira da despesa.                                              |
| `sgUF`           | Estado pelo qual o deputado foi eleito, usado para a mediana da UF.                    |

`sgUF` vem do próprio arquivo, e não do snapshot público do produto, porque o snapshot representa o estado mais recente — usá-lo atribuiria a UF atual a um ano antigo.

O vínculo com o produto usa `ideCadastro`, não `nuDeputadoId`. O primeiro é o mesmo identificador do deputado usado pela API da Câmara; o segundo pertence ao sistema interno da CEAP.

Os demais campos não precisam ser persistidos neste incremento. O arquivo bruto continua sendo a fonte auditável para reprocessamento futuro.

## Evidências encontradas em 2025

- 562 deputados distintos têm despesas e todos existem no arquivo atual de deputados do produto.
- Há 19 categorias.
- Todo registro tem `numSubCota` e `txtDescricao`.
- Dentro do arquivo, cada `numSubCota` corresponde a exatamente uma descrição.
- Há 937 registros sem `ideCadastro`, referentes a lideranças; eles ficam fora do Perfil do deputado.
- Há valores negativos, principalmente compensações e cancelamentos de passagens.
- Há 86 agregados mensais negativos por deputado e categoria.
- Há um agregado anual negativo por deputado e categoria entre 4.389 combinações.
- `ideDocumento` não identifica unicamente uma linha e não participa desta agregação.

Essas evidências valem para o arquivo analisado. A ingestão deve validar as mesmas invariantes em cada ano, sem presumir que a lista de códigos permanecerá imutável.

## Regra monetária

O valor utilizado por registro é:

```text
valor utilizado = vlrLiquido - vlrRestituicao
```

Quando `vlrRestituicao` estiver vazio, seu valor é zero.

Essa regra produz uma única métrica pública simples sem perder o efeito financeiro de valores devolvidos à Câmara. A glosa não é subtraída novamente porque já está refletida em `vlrLiquido` pela fonte.

Valores negativos são preservados. Eles reduzem os agregados da categoria, do mês e do ano e não devem ser rejeitados, convertidos em zero ou apresentados como despesa positiva.

Todo cálculo monetário usa decimal exato. O banco usa `numeric` com duas casas decimais; contratos JSON usam centavos inteiros. Não se usa ponto flutuante na ingestão ou na agregação.

## Agregação

### Unidade agregada

A menor unidade agregada é:

```text
deputado + ano + mês + categoria
```

Para cada combinação, a ingestão soma o valor utilizado dos registros da fonte. Essa matriz é gravada por deputado-ano, conforme [Persistência](#persistência).

O total mensal é derivado pela soma das categorias do mês. O total anual é derivado pela soma dos doze meses. Não se persiste uma segunda cópia desses totais.

Devem valer as invariantes:

```text
soma das categorias de um mês = total do mês
soma dos doze meses = total anual
soma anual das categorias = total anual
```

### Contexto do total

O total anual sozinho é um número sem escala. O leitor não tem como saber se R$ 427 mil é muito, pouco ou o esperado — e forma uma opinião de qualquer forma, normalmente inventando a escala errada.

A ausência de escala não é neutra. O teto da cota varia por estado porque embute o preço da passagem Brasília–capital: em 2026 vai de R$ 41.612,55 (DF) a R$ 58.474,70 (RR), spread de cerca de 40%. Um total absoluto, exibido sem denominador, mede sobretudo geografia — introduzindo um viés sistemático a favor de deputados do Sudeste.

O contexto adotado é a **mediana da UF no ano**:

```text
R$ 427.978,20
Total utilizado em 2025

Mediana dos deputados de MG em 2025: R$ 391.204,00
```

Comparar dentro do mesmo estado neutraliza o viés na raiz, porque todos os comparados têm o mesmo teto — sem precisar conhecer o teto. E sai inteiramente do arquivo já ingerido, sem fonte, download ou manutenção nova.

A seção também exibe a ressalva de que a cota varia por estado, para que o número não seja lido como comparável entre UFs.

#### Exercício parcial

Um deputado que assumiu em agosto gastou menos por ter exercido menos, não por economia. Comparar seu total contra a mediana produziria uma leitura falsa.

Regra: a mediana é calculada **somente sobre deputados que exerceram o ano inteiro**, usando `deputado_exercicio_intervalo`. Quando o deputado exibido não exerceu o ano inteiro, a comparação **não é apresentada** — no lugar dela, o texto informa o período exercido naquele ano.

Deliberadamente não se aplica pró-rata. Extrapolar o gasto de cinco meses para doze presume um padrão mensal constante que a distribuição real não sustenta, e produziria um número que nunca existiu.

**A janela do ano não é o ano civil.** Medido contra a base completa na implementação de #117: ancorar a regra em 1º de janeiro produz **zero** deputados elegíveis em 2015, 2019 e 2023. Em ano de início de legislatura ninguém atravessa 1º de janeiro — todos os intervalos abrem na posse, inclusive os dos reeleitos, que ganham intervalo novo. Em 2023, 513 intervalos abrem no mesmo instante, `2023-02-01 12:05`.

Regra adotada: a janela começa no mais tarde entre 1º de janeiro e o **fim do dia** de início de uma legislatura que comece dentro do ano, e termina em 31 de dezembro. O fim do dia, e não o instante da posse, porque a sessão acontece no meio do dia. Com isso 2023 devolve 460 elegíveis, na mesma faixa dos demais anos, e quem assumiu dias depois da posse continua fora. A comparação permanece justa porque, nesses anos, todos começaram na mesma data.

### Cinco maiores categorias

As cinco categorias principais são escolhidas pela soma anual, em ordem decrescente de valor utilizado. Todas as demais formam **Outras despesas**.

As mesmas cinco categorias anuais são usadas nas doze barras mensais. Não se recalcula um top 5 por mês, pois isso faria cores e legendas mudarem de significado ao longo do gráfico.

Empates são resolvidos por `numSubCota` crescente para manter resultado determinístico.

O agrupamento de apresentação é:

```text
categoria anual 1
categoria anual 2
categoria anual 3
categoria anual 4
categoria anual 5
outras despesas
```

Não se juntam semanticamente categorias semelhantes. Por exemplo, as modalidades de passagem aérea permanecem categorias oficiais distintas, salvo futura regra de domínio documentada.

### Descrições

`numSubCota` identifica a categoria; `txtDescricao` fornece seu texto. A descrição não deve ser usada como chave.

A fonte é preservada sem alteração na persistência. A apresentação pode normalizar espaços, pontuação e capitalização, mas não pode mudar o significado nem combinar categorias.

Um mesmo código com descrições conflitantes dentro do mesmo arquivo é uma rejeição de ingestão. Um código novo é aceito e agregado normalmente.

## Persistência

A menor unidade **agregada** continua sendo deputado, ano, mês e categoria. A menor unidade **persistida** é o par deputado-ano: `deputado_gasto_cota` guarda uma linha por `(deputado_id, year)`, com a matriz mês × categoria em `jsonb`.

| Coluna        | Tipo      | Regra                                |
| ------------- | --------- | ------------------------------------ |
| `id`          | `uuid`    | Surrogate key interna.               |
| `deputado_id` | `uuid`    | FK para `deputado.id`.               |
| `year`        | `integer` | Ano de competência.                  |
| `gastos_json` | `jsonb`   | `{ mês: { numSubCota: centavos } }`. |

Restrição única: `(deputado_id, year)`.

A razão é o padrão de leitura. Toda consulta do produto pede um deputado e um ano, e devolve o ano inteiro: o endpoint de gastos, a rosca anual e as barras mensais consomem a mesma resposta. Nenhuma leitura cruza deputados ou anos — a mediana da UF é pré-calculada na ingestão, que já tem todos os agregados em memória, e as varreduras de validação rodam sobre os arquivos brutos com o módulo puro, sem banco.

O grão relacional foi medido antes da decisão: um ano ocupava 10 MB (38.889 linhas, 5,4 MB só de índices) contra **1 MB** na forma agregada — cerca de 190 MB contra 20 MB para 2008 em diante, sobre um free tier de 512 MB que também carrega o resto do dump. Havia ainda três índices sobrepostos, dois deles prefixos do índice único.

O precedente é `votacao_votos.votosJson`, que guarda os votos de uma votação como JSON pela mesma razão: a leitura sempre quer o conjunto inteiro.

O custo aceito é perder consulta analítica ad-hoc por categoria no SQL. Confronto nominal de gastos entre deputados está fora de escopo, e a análise exploratória tem os arquivos anuais e o agregador puro.

Centavos são inteiros dentro do JSON, o que elimina a fronteira `numeric` ↔ centavos: um total anual gira na casa de 5 × 10⁷ centavos, muito abaixo do limite de inteiro exato em ponto flutuante binário, então o valor atravessa serialização e desserialização sem perda. Não existe mais coluna numérica na cadeia.

### Categorias

`numSubCota` identifica a categoria e é a chave dentro do JSON; a descrição vive em `cota_categoria`, uma linha por código:

| Coluna                  | Tipo      | Regra                                            |
| ----------------------- | --------- | ------------------------------------------------ |
| `id`                    | `uuid`    | Surrogate key interna.                           |
| `external_num_sub_cota` | `integer` | Código da fonte, único.                          |
| `descricao`             | `text`    | Descrição oficial da categoria no arquivo anual. |

São 18 a 19 linhas. Antes, a mesma descrição de 34 caracteres se repetia em 38 mil linhas por ano. A tabela também torna estrutural a regra de que o código identifica e a descrição é só texto — a validação de descrições conflitantes dentro de um arquivo continua na ingestão.

### Cobertura por ano

A fronteira do dado é propriedade do **arquivo anual**, não de um deputado, então mora em `cota_cobertura` — uma linha por ano carregado:

| Coluna                  | Tipo          | Regra                                          |
| ----------------------- | ------------- | ---------------------------------------------- |
| `id`                    | `uuid`        | Surrogate key interna.                         |
| `year`                  | `integer`     | Ano de competência, único.                     |
| `covered_through_month` | `integer`     | Último mês coberto pelo arquivo, entre 1 e 12. |
| `ingested_at`           | `timestamptz` | Momento da substituição anual.                 |

`covered_through_month` é derivado na ingestão como o maior `numMes` presente no arquivo daquele ano, sobre todos os deputados — não por deputado, senão um parlamentar sem gasto em dezembro faria dezembro virar lacuna para ele. Anos encerrados e completos gravam `12`.

Sem essa tabela, a interface não consegue distinguir "não gastou" de "não carregado", e cai no problema descrito em [Fronteira do dado](#fronteira-do-dado).

### Mediana por UF e ano

A mediana é **pré-calculada na ingestão**, não no request. Calculá-la em runtime exigiria somar os agregados de todos os deputados de um estado a cada leitura de perfil, no free tier.

Ela não sai do passo anual, e sim de um passo derivado próprio, `cota_mediana_uf`, declarado **depois** de `deputado_exercicio_intervalo`. O motivo é de ordem: no plano, `deputado_gasto_cota` roda antes dos intervalos, então derivar a mediana dentro dele consumiria intervalos da execução anterior. Como passo derivado, ele também se refaz sozinho quando o histórico — que é manual — chega depois, e recalcula todos os anos que têm cobertura. Se os intervalos ainda não existem, o passo pula sem apagar medianas boas, como os demais passos derivados.

| Coluna                    | Tipo      | Regra                                   |
| ------------------------- | --------- | --------------------------------------- |
| `id`                      | `uuid`    | Surrogate key interna.                  |
| `year`                    | `integer` | Ano de competência.                     |
| `sigla_uf`                | `text`    | UF vinda de `sgUF` no arquivo.          |
| `valor_utilizado_mediana` | `bigint`  | Mediana dos totais anuais, em centavos. |
| `deputado_count`          | `integer` | Quantos deputados entraram no cálculo.  |

A tabela é `cota_mediana_uf`, única em `(year, sigla_uf)`. Entram apenas deputados que exerceram o ano inteiro, conforme a regra de exercício parcial. `deputado_count` é publicado junto com a mediana: uma mediana sobre três deputados não merece a mesma confiança que uma sobre setenta, e esconder o denominador esconde isso.

Amostra par cai em meio centavo, porque a mediana é a média dos dois valores centrais. O arredondamento é para o centavo mais próximo, afastando de zero, para não puxar um par negativo na direção do positivo.

A UF de cada deputado no ano entrou como coluna `sigla_uf` de `deputado_gasto_cota`, que já tem exatamente o grão `(deputado_id, year)`. Um mesmo `ideCadastro` com dois `sgUF` no mesmo arquivo aborta a carga, pelo mesmo motivo que um código de categoria com descrições conflitantes: UF errada contamina a mediana de dois estados em silêncio. Nas 3,1 milhões de linhas de 2015 a 2026 não houve nenhuma ocorrência.

Como a UF só existe no arquivo, linha a linha, nenhuma linha já carregada tinha como recebê-la: a migração `0014` limpa `deputado_gasto_cota` e `cota_cobertura` antes de adicionar a coluna, e os anos são reingeridos por substituição anual completa.

Os nomes passaram pela ADR 007 na implementação: substantivo de domínio em português (`deputado_gasto_cota`, `cota_categoria`, `cota_cobertura`, `valor_utilizado`), genéricos em inglês (`year`, `month`, `covered_through_month`). O rascunho anterior — `deputado_ceap_monthly_category`, `amount_used` — misturava sigla de domínio com substantivos genéricos em inglês na mesma posição.

## Ingestão

### Download

Chamar a CEAP de "fonte específica" subestima a mudança. Hoje `buildCsvDownloadPlan` monta toda URL por uma fórmula única, a partir de um só host:

```ts
url: `${baseUrl}/${dataset}/csv/${filename}`;
```

A CEAP diverge em **todos** os eixos dessa fórmula — host (`www.camara.leg.br`, não `dadosabertos`), forma do caminho (`/cotas/`), nome do arquivo (`Ano-{year}`, não `{dataset}-{year}`) e formato (ZIP, não CSV). Não é um membro atípico da família existente; é uma segunda família.

**Decisão: generalizar o plano existente, em vez de criar um downloader separado.** Cada dataset passa a carregar seu próprio construtor de URL e uma marca de arquivo compactado, que dispara a extração após o download.

O motivo é operacional, não estético. O pipeline é manual: alguém roda o comando à mão e sobe `pg_dump`. Um segundo downloader significaria dois comandos, com janelas de anos e flags próprios, e duas políticas de retry e movimentação atômica livres para divergir — divergência que só aparece quando falha. Generalizar mantém um CLI, um config, um caminho de resiliência, e faz `--dataset=ceap` funcionar no comando que já existe.

O custo aceito é que o plano deixa de ser uma fórmula e vira uma tabela de estratégias, inicialmente com um único membro de cada lado.

Fluxo para a CEAP:

1. baixa `Ano-{year}.csv.zip` para um arquivo temporário;
2. valida o ZIP e o nome do CSV esperado;
3. extrai em diretório temporário;
4. valida que o CSV pode ser aberto;
5. move o arquivo completo para o destino de forma atômica.

O piso `firstCsvYear = 2001` não precisa de dispensa: os arquivos da CEAP começam em 2008. Mas a faixa válida do dataset é 2008 em diante, e pedir um ano anterior deve falhar com mensagem própria, não baixar um 404.

Depois do download, o conteúdo de `apps/api/data/raw/` permanece somente leitura. Testes usam `Readable` em memória ou arquivos em diretório temporário; nunca escrevem fixtures em `data/raw/`.

### Processamento

O passo anual de ingestão:

1. lê o CSV como stream, respeitando campos delimitados que contenham quebras de linha;
2. seleciona somente linhas com `ideCadastro` preenchido;
3. valida `numAno` contra o ano solicitado;
4. valida `numMes` entre 1 e 12;
5. valida e converte `numSubCota`, `vlrLiquido` e `vlrRestituicao`;
6. resolve `ideCadastro` para `deputado.id`;
7. agrega em memória por deputado, ano, mês e categoria;
8. valida a relação código-descrição;
9. somente depois de concluir todas as validações, substitui transacionalmente os agregados daquele ano.

Linhas sem `ideCadastro` são contabilizadas como ignoradas por pertencerem a lideranças fora do escopo, não como lacunas de deputado.

Um `ideCadastro` preenchido sem correspondente no produto é registrado como lacuna externa. Em modo estrito, impede a substituição do snapshot anual.

A substituição anual evita inventar uma chave natural por linha e remove agregados que tenham desaparecido após correções da Câmara.

## Contrato público

Endpoint conceitual:

```text
GET /deputados/{externalIdDeputado}/ceap?year={year}
```

O nome do recurso é `ceap`, não `ceap-expenses`: CEAP é sigla de domínio e não se mistura com um substantivo genérico em inglês na mesma posição, conforme a ADR 007.

Ausência de `year` assume o default do perfil definido no incremento 1, não o ano corrente cru — um ex-deputado abriria em um ano sem dados. O frontend preserva explicitamente o ano efetivo na URL como `?year={year}`.

O backend aceita anos entre 2008 e o ano corrente, e rejeita anos fora da faixa do deputado.

### Três conjuntos de anos, não um

Existem três recortes anuais distintos, e confundi-los reproduz, no eixo do ano, o mesmo erro descrito em [Fronteira do dado](#fronteira-do-dado):

1. a **faixa do deputado**, derivada dos períodos de legislatura no incremento 1;
2. os anos em que **existe arquivo** da CEAP, de 2008 em diante;
3. os anos **efetivamente ingeridos** — que, dado o pipeline manual, serão um subconjunto por muito tempo.

Se um deputado exerceu 2015 e esse ano ainda não foi carregado, responder "não há gastos da cota disponíveis para este ano" afirma que ele não gastou dinheiro público naquele ano. É falso, e é mais provável de acontecer que o caso mensal, porque ingerir dezenove anos de uma vez é caro e a ordem natural é começar pelos recentes.

A tabela de cobertura já é o registro autoritativo do que foi ingerido: ela tem exatamente uma linha por ano carregado.

Portanto:

- `availableYears` é a interseção entre anos ingeridos e a faixa do deputado. O seletor **não oferece** ano não carregado, em vez de oferecer e depois negar.
- Ano não carregado, pedido diretamente pela URL, devolve `status = "ano-nao-carregado"` — estado próprio, com texto informando que o ano ainda não foi carregado, nunca que não houve gasto.
- `status = "sem-gastos"` fica reservado ao caso verdadeiro: ano carregado, deputado sem nenhum registro nele.
- `status = "ok"` é o caso com dados.

Esse campo substitui o booleano `hasData`, que não conseguia distinguir os dois vazios.

Resposta conceitual:

```json
{
  "year": 2025,
  "availableYears": [2023, 2024, 2025],
  "status": "ok",
  "coveredThroughMonth": 8,
  "totalAmountUsedCents": 42797820,
  "siglaUf": "MG",
  "exercicioAnoCompleto": true,
  "medianaUf": {
    "amountUsedCents": 39120400,
    "deputadoCount": 53
  },
  "categories": [
    {
      "externalNumSubCota": 1,
      "description": "MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR",
      "amountUsedCents": 18238531
    }
  ],
  "months": [
    {
      "month": 1,
      "totalAmountUsedCents": 3145020,
      "categories": [
        {
          "externalNumSubCota": 1,
          "amountUsedCents": 1430000
        }
      ]
    }
  ]
}
```

A resposta contém todos os agregados oficiais. A transformação em cinco categorias mais **Outras despesas** é uma regra de apresentação pura e compartilhada pelos dois gráficos.

Os schemas Zod e tipos públicos são definidos uma única vez em `@vota-comigo/shared-types`. API e frontend não redeclaram esses formatos.

## Interface

### Hierarquia

A seção **Gastos da cota parlamentar** contém, nesta ordem:

1. seletor de ano;
2. distribuição anual por categoria;
3. gastos por mês;
4. indicação da Câmara dos Deputados como fonte.

Não há seletor de mês.

### Distribuição anual

O total anual é apresentado em um gráfico de rosca. O centro da rosca mostra:

```text
R$ 427.978,20
Total utilizado em 2025
```

As seis fatias representam as cinco maiores categorias e **Outras despesas**. A legenda fica ao lado em telas largas e abaixo do gráfico no celular.

A rosca **não é** a única representação da distribuição anual. A exclusividade dependia de uma premissa que a varredura de #118 derrubou: agregados negativos ocorrem no recorte exibido, em 0,77% dos pares deputado-ano e em quase todos os anos — ver [Resultados da validação](#resultados-da-validação). Uma rosca com fatia negativa, ou com total anual não positivo, é matematicamente enganosa, porque o ângulo de uma fatia não representa valor negativo.

**Regra de domínio adotada.** Para um par deputado-ano, a distribuição anual usa a rosca, exceto quando algum grupo de apresentação tem valor anual negativo ou o total anual não é positivo. Nesse caso, e somente nele, a distribuição é apresentada como lista de barras horizontais, que representa negativo nativamente. A regra é do par, não da sessão: trocar de ano pode trocar de representação.

O caminho de barras dispara em 58 dos 7.448 pares medidos (0,78%). É pouco, e um caminho que quase nunca dispara quase nunca é exercitado — por isso ele não é opcional nos testes: o modo barras tem cobertura de teste própria, com um par negativo real do conjunto ingerido, e não depende de ser encontrado por acaso em uso.

A alternativa de desenhar a rosca sobre valores absolutos foi rejeitada: faria a soma visual deixar de corresponder ao total retornado pela API, contrariando um critério de aceite desta própria seção.

### Gastos por mês

O agregado mensal usa barras verticais empilhadas:

- uma barra para cada mês;
- doze barras sempre visíveis;
- sem rolagem horizontal;
- abreviações `jan`, `fev`, `mar`, `abr`, `mai`, `jun`, `jul`, `ago`, `set`, `out`, `nov`, `dez`;
- as mesmas seis séries e cores do gráfico anual;
- escala absoluta, não normalizada para 100%;
- valores negativos abaixo da linha de zero.

### Fronteira do dado

Um mês sem registros e um mês ainda não carregado **não podem renderizar igual**. Os dois significados são opostos: "não gastou" e "não sabemos". Colapsar ambos em uma barra zerada faz a página afirmar, sozinha, que um deputado não gastou dinheiro público em um período — afirmação falsa, sobre dinheiro público, sem que ninguém tenha escrito uma palavra errada.

O risco é agudo aqui por três motivos que se somam: a fonte muda diariamente, o ano corrente é o default da seção, e o eixo é mensal, o que expõe o buraco visualmente em vez de diluí-lo. E o pipeline real amplifica: a ingestão é local, roda à mão, e produção recebe `pg_dump` — então o atraso entre a fonte e o produto é a regra, não a exceção.

Portanto:

- Um mês **dentro** da cobertura do dado e sem registros é zero legítimo: barra visível, total zero.
- Um mês **além** da cobertura é lacuna: renderizado como sem dados, visualmente distinto de zero, fora do total do ano, com entrada própria na legenda.
- A seção exibe um carimbo de cobertura, no formato `Dados da Câmara até {mês}/{ano}`.

A fronteira **não é derivável dos agregados** — um deputado pode legitimamente não ter gasto em novembro. Ela precisa ser registrada na ingestão, como "este arquivo anual cobria até tal mês", e persistida por ano carregado.

O carimbo também resolve o frescor: sem ele, a seção promete uma atualidade que o pipeline manual não entrega.

### Interação

No desktop:

- hover destaca o segmento e mostra seus dados;
- clique fixa a seleção;
- foco e setas do teclado oferecem o mesmo acesso.

No celular:

- toque seleciona o segmento;
- os dados aparecem em uma região persistente abaixo do gráfico;
- não se usa tooltip flutuante sobre as barras;
- tocar em outro segmento atualiza a região.

Conteúdo da interação anual:

```text
Manutenção de escritório
R$ 182.385,31
```

Conteúdo da interação mensal:

```text
Março · Manutenção de escritório
R$ 16.420,80
```

Não há texto explicativo adicional da categoria.

### Cores

A cor é atribuída por **`numSubCota`** e nunca por posição no ranking. Os oito códigos que dominam nacionalmente usam uma paleta principal de alta distinção; os demais recebem cores secundárias menos saturadas, derivadas deterministicamente do código.

Atribuir por posição faria a mesma cor significar categorias diferentes ao trocar de ano, já que o top 5 é calculado por deputado e por ano. É o mesmo defeito que a regra do top 5 anual evita no eixo mensal — o doc já argumenta que recalcular por mês "faria cores e legendas mudarem de significado" —, só que um nível acima. E o dano é maior aqui: quem troca de ano está procurando mudança de comportamento, e cor remapeada inventa mudança onde não houve.

Fixar 20 cores com a mesma prioridade perceptiva é inviável: não existem 20 cores simultaneamente distinguíveis com contraste acessível. A saída é uma hierarquia em duas camadas. A paleta principal cobre as categorias que dominam nacionalmente; as demais recebem cores secundárias que preservam a identidade da categoria sem competir com as oito principais. A cor neutra fica reservada a **Outras despesas**, porque reutilizá-la em uma categoria específica torna duas fatias diferentes visualmente idênticas.

A varredura de #118 mediu a concentração e fixou o tamanho da paleta principal em **oito códigos**, que cobrem 92,0% dos segmentos desenhados:

| `numSubCota` | Categoria                        | Pares em que aparece no top 5 |
| ------------ | -------------------------------- | ----------------------------- |
| 5            | Divulgação da atividade          | 82,6%                         |
| 3            | Combustíveis e lubrificantes     | 76,0%                         |
| 120          | Locação ou fretamento de veículos | 68,8%                         |
| 1            | Manutenção de escritório         | 66,7%                         |
| 999          | Passagem aérea — RPA             | 49,2%                         |
| 998          | Passagem aérea — SIGEPA          | 38,8%                         |
| 10           | Telefonia                        | 33,6%                         |
| 4            | Consultorias e trabalhos técnicos | 29,5%                         |

O nono código mais frequente cai para 8,6%, o que torna oito um corte natural. Estender a paleta a dez subiria a cobertura para 95,5% ao custo de duas cores adicionais que precisariam se distinguir das oito com contraste acessível.

- Uma cor representa a mesma categoria em todos os gráficos, deputados e anos, inclusive quando ela está fora da paleta principal.
- **Outras despesas** usa sempre uma cor neutra.
- Categoria fora da paleta principal que apareça em um top 5 recebe uma cor secundária menos saturada, derivada deterministicamente de `numSubCota`.
- Cores não representam avaliação positiva, negativa, partido ou ideologia.
- As oito categorias principais recebem a maior distinção perceptiva; as secundárias podem ter menor distinção entre si, mas nunca usam a cor neutra de **Outras despesas**.
- A legenda e a região textual impedem que a leitura dependa somente de cor.
- A ordem das séries é a mesma na rosca, na legenda, nas barras e na alternativa textual.

### Estados

**Carregamento:** skeleton com as dimensões finais dos gráficos, evitando mudança de layout.

**Sem gastos** (`status = "sem-gastos"`) — ano carregado, deputado sem nenhum registro:

```text
Este deputado não registrou gastos da cota em {year}.
```

**Ano não carregado** (`status = "ano-nao-carregado"`) — alcançável apenas por URL, já que o seletor não oferece o ano:

```text
Os gastos da cota de {year} ainda não foram carregados.
```

Os dois textos nunca se substituem. O primeiro afirma ausência de gasto; o segundo, ausência de dado.

**Falha:** mensagem local na seção; o restante do Perfil do deputado continua disponível.

**Uma categoria:** rosca completa com uma única entrada na legenda.

**Mês zerado:** mês presente no eixo, sem segmento desenhado, contando zero no total.

**Mês além da cobertura:** mês presente no eixo, marcado como sem dados, fora do total.

## Resultados da validação

As varreduras de #118 rodaram em 2026-08-13 sobre o conjunto ingerido de **2015 a 2026** — 7.448 pares deputado-ano, 12 arquivos anuais. Elas mediram os **seis grupos de apresentação** (as cinco maiores categorias anuais mais **Outras despesas**), não as categorias cruas, aplicando o módulo puro `deriveGruposGastoCota` sobre a matriz mês × categoria já persistida.

Os anos de 2008 a 2014 ficaram deliberadamente fora: os arquivos existem na fonte, mas o produto começa em 2015 e nenhuma decisão desta seção dependia deles. Reabrir a faixa exige repetir estas varreduras.

**1. Agregados negativos no recorte exibido — ocorrem.**

| Recorte                      | Pares afetados | % dos pares | Pior caso        |
| ---------------------------- | -------------- | ----------- | ---------------- |
| Grupo anual negativo         | 57             | 0,77%       | −R$ 13.288,98    |
| Grupo mensal negativo        | 1.085          | 14,57%      | −R$ 30.309,96    |
| Total anual não positivo     | 36             | 0,48%       | —                |

Os negativos se concentram nas passagens aéreas — `998` (SIGEPA) e `999` (RPA) respondem por 44 das 59 ocorrências anuais e por 1.258 das 1.377 mensais —, o que é coerente com compensações e cancelamentos de bilhete. Quinze das ocorrências anuais caem dentro de **Outras despesas**: o agrupamento de fato absorve negativos, como a hipótese previa. Não é um outlier de um ano: há grupo anual negativo em oito dos doze anos.

Consequência: a rosca exclusiva **reabriu e foi substituída** pela regra de domínio descrita em [Distribuição anual](#distribuição-anual). A união dos dois gatilhos — algum grupo anual negativo ou total anual não positivo — atinge 58 pares, 0,78% do conjunto.

**2. Concentração das categorias no top 5 — oito códigos bastam para a paleta principal.**

Dos 20 códigos existentes, **19 aparecem em algum top 5**, então fixar cor por código é inviável e a paleta precisa de um corte. A cobertura pelas N mais frequentes:

| N   | Pares com o top 5 inteiro dentro da paleta | Segmentos cobertos |
| --- | ------------------------------------------ | ------------------ |
| 5   | 8,8%                                       | 70,9%              |
| 6   | 25,3%                                      | 78,9%              |
| 7   | 43,1%                                      | 85,9%              |
| 8   | 66,4%                                      | 92,0%              |
| 9   | 72,9%                                      | 93,7%              |
| 10  | 80,0%                                      | 95,5%              |

A paleta principal foi definida em **oito códigos** — ver [Cores](#cores). A métrica que governa a decisão é a de segmentos, não a de pares: ela determina quais categorias recebem máxima distinção perceptiva. Uma revisão visual da #121 mostrou que usar a mesma cor neutra para uma categoria específica e para **Outras despesas** prejudica a associação entre fatia e legenda. Por isso categorias fora da paleta principal recebem cores secundárias estáveis, enquanto a legenda e a alternativa textual continuam sendo as referências definitivas.

O churn do top entre anos consecutivos do mesmo deputado é alto: em 61,96% dos 5.865 pares de anos consecutivos o conjunto muda ao menos uma categoria, quase sempre exatamente uma (2.865 casos). Isso **confirma** a decisão de atribuir cor por `numSubCota` e nunca por posição no ranking — com cor por posição, três em cada cinco trocas de ano remapeariam cores e inventariam mudança de comportamento onde não houve. Não justifica migrar para top pela união dos anos: o custo dessa alternativa é o top de um ano deixar de ser o top daquele ano, e o problema que ela resolveria já está resolvido pela cor por código.

**3. Armazenamento — folga confirmada.**

Medido no banco local com os 12 anos ingeridos: `deputado_gasto_cota` ocupa 9,5 MB no total, dos quais 1,3 MB de índices — cerca de 0,8 MB por ano, contra os 10 MB por ano que o grão relacional custava. `cota_categoria`, `cota_cobertura` e `cota_mediana_uf` são desprezíveis. O banco inteiro está em 130 MB. Estender a carga a 2008 somaria cerca de 5,5 MB. Contra os 512 MB do free tier, a folga é larga e a decisão de [Persistência](#persistência) se confirma sobre o conjunto completo.

**4. Tamanho de amostra da mediana — sem piso, com denominador visível.**

Sobre os 324 pares `(year, sigla_uf)`, as amostras vão de **4 a 67 deputados**; apenas quatro pares ficam abaixo de seis, e o menor é 4 (2025/AP e 2024/SE). Nenhuma mediana é não positiva.

Decisão: **não há piso**. A comparação é sempre exibida, acompanhada de `deputado_count`. Suprimir a mediana em uma UF pequena tiraria a referência justamente de quem tem menos referência própria, e o denominador publicado já permite ao leitor calibrar a confiança — que é a razão de ele existir.

**5. Periodicidade real da fonte — não se aplica.**

A pergunta pressupunha um produto que acompanha a fonte. Não é o caso: a ingestão é manual e produção funciona como um snapshot, sem atualização automática. A periodicidade do arquivo oficial, declarada ou não, não afeta a cobertura do dado exibida — quem a determina é o momento da última ingestão manual, que é o que o carimbo de [Fronteira do dado](#fronteira-do-dado) comunica.

**6. Invariantes por ano — nenhum ano falha.**

Os 12 arquivos foram ingeridos sem nenhuma rejeição fatal, o que já prova, por ano, a relação um-para-um entre `numSubCota` e `txtDescricao` e a ausência de `ideCadastro` com duas `sgUF`. A varredura acrescentou o eixo entre anos: **nenhum código muda de descrição de um ano para outro**.

O conjunto de códigos **cresce ao longo do tempo** — a união dos 12 anos tem 20 códigos, e cada ano tem entre 18 e 20: `998` (passagem aérea SIGEPA) aparece a partir de 2019 e `145` (tokens e certificados digitais) a partir de 2022. É exatamente o caso que a ingestão já aceita, por tratar código novo como categoria nova em vez de rejeição.

Linhas sem `ideCadastro`, referentes a lideranças e ignoradas pela ingestão, variam de 392 a 937 por ano.

## Biblioteca de gráficos

A implementação usa **Recharts 3** em vez de gráficos SVG ou CSS construídos manualmente.

Motivos:

- oferece gráficos de pizza/rosca e barras empilhadas;
- suporta barras positivas e negativas;
- produz SVG responsivo;
- fornece tooltip por hover ou clique;
- inclui camada de acessibilidade e navegação por teclado habilitadas por padrão;
- é compatível com React 19 e TypeScript 5, usados pelo projeto.

O Chart.js não é adotado porque renderiza em `canvas`, cujo conteúdo não é acessível a leitores de tela sem uma alternativa construída manualmente. Uma implementação própria reduziria dependências, mas transferiria para o produto a responsabilidade por geometria, redimensionamento, hit areas, teclado, toque e posicionamento da informação interativa.

Referências:

- [Recharts PieChart](https://recharts.github.io/en-US/api/PieChart/)
- [Recharts Tooltip](https://recharts.github.io/en-US/api/Tooltip/)
- [Acessibilidade do Recharts](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)
- [Acessibilidade do Chart.js](https://www.chartjs.org/docs/latest/general/accessibility.html)

Os gráficos ficam em um componente cliente folha, carregado somente na página do perfil. A rota, a busca dos dados e o restante do perfil continuam como componentes de servidor.

Mesmo com a camada acessível do Recharts, os dados dos gráficos têm alternativa textual estruturada para leitores de tela. A informação disponível por hover também precisa estar disponível por foco e toque.

Animações são curtas e comunicam somente a troca de ano ou seleção. `prefers-reduced-motion` desabilita movimentos não essenciais.

## Critérios de aceite

### Ingestão e agregação

- O plano do downloader existente foi generalizado para construtor de URL e extração por dataset; não há um segundo downloader nem um segundo CLI.
- `--dataset=ceap` funciona no comando de download já existente.
- Os datasets atuais continuam produzindo exatamente as mesmas URLs de antes da generalização.
- Ano anterior a 2008 pedido para a CEAP falha com mensagem própria, sem tentar o download.
- A ingestão nunca escreve fixtures ou arquivos temporários em `data/raw/`.
- `ideCadastro` resolve o deputado; `nuDeputadoId` não é usado no vínculo.
- Lideranças sem `ideCadastro` são ignoradas e contabilizadas.
- Valores monetários são processados sem ponto flutuante.
- Restituições reduzem o valor utilizado da categoria correspondente.
- Valores negativos são preservados.
- Cada código tem uma descrição por arquivo anual.
- A soma das categorias fecha com cada mês e com o ano.
- Reprocessar o mesmo arquivo produz os mesmos agregados.
- Substituir um arquivo anual corrigido remove agregados obsoletos.

### API

- Ano inválido retorna erro de entrada.
- Deputado inexistente retorna `404`.
- Deputado sem despesas em ano carregado recebe `status = "sem-gastos"`, não `404`.
- Ano dentro da faixa do deputado mas não ingerido recebe `status = "ano-nao-carregado"`, com texto distinto de "sem gastos".
- `availableYears` contém apenas anos ingeridos que pertencem à faixa do deputado.
- A resposta contém exatamente os meses 1 a 12 em ordem.
- Valores públicos usam centavos inteiros.
- Contratos são validados pelos schemas de `@vota-comigo/shared-types`.

### Apresentação

- O ano fica preservado na URL.
- As cinco categorias são escolhidas pelo agregado anual.
- **Outras despesas** contém todas as categorias restantes.
- As mesmas séries aparecem nos dois gráficos.
- A cor de uma categoria é a mesma em qualquer deputado e qualquer ano, atribuída por `numSubCota` e nunca por posição no ranking.
- A soma visual corresponde ao total retornado pela API.
- Os doze meses cabem sem rolagem horizontal em viewport mobile suportada.
- Hover, clique, foco e toque dão acesso a período, categoria e valor.
- A interface não depende somente de cor.
- Valores mensais negativos aparecem abaixo de zero.
- Meses além da cobertura do dado aparecem como sem dados, não como zero, e ficam fora do total.
- A seção exibe o carimbo de cobertura da fonte.
- O total anual aparece acompanhado da mediana da UF no ano e do número de deputados no cálculo.
- A mediana considera apenas deputados que exerceram o ano inteiro.
- Deputado com exercício parcial no ano não recebe comparação, e sim o período exercido.
- Nenhum pró-rata é aplicado a gastos de exercício parcial.
- A seção exibe a ressalva de que a cota varia por estado.
- As varreduras de validação foram executadas contra o conjunto ingerido antes do frontend.
- A distribuição anual cai para lista de barras quando algum grupo anual é negativo ou o total anual não é positivo, e o modo barras tem cobertura de teste própria.
- A mediana da UF é sempre exibida, acompanhada do número de deputados no cálculo, sem piso de amostra.
- Estados de carregamento, ausência de dados e falha não alteram o restante do perfil.
- Testes de navegador cobrem troca de ano, seleção por toque e navegação por teclado.

## Sequência recomendada de implementação

1. generalizar o plano do downloader (construtor de URL e extração por dataset), mantendo as URLs dos datasets atuais idênticas;
2. implementar o download e a extração da fonte CEAP;
3. adicionar tabelas e migrações: agregados mensais por categoria, cobertura por ano, UF por deputado-ano, mediana por UF-ano;
4. implementar o passo anual de ingestão, suas invariantes, a cobertura e a mediana;
5. ~~executar as varreduras de validação contra o conjunto ingerido~~ — feito em #118; os [Resultados da validação](#resultados-da-validação) reabriram a rosca exclusiva e fixaram a paleta principal em oito códigos;
6. adicionar schemas e tipos compartilhados, já com `status`, cobertura e mediana estabilizados pelo passo anterior;
7. implementar repositório, serviço e endpoint dos gastos da cota;
8. ~~implementar transformação pura de top 5 mais **Outras despesas**~~ — feito em #118 (`deriveGruposGastoCota`), porque as varreduras precisavam medir os grupos de apresentação;
9. implementar seletor de ano, os três estados e o carimbo de cobertura;
10. adicionar os gráficos com Recharts e alternativa textual acessível;
11. validar responsividade, teclado, toque, valores negativos e a fronteira do dado com Playwright.

A ordem mudou de propósito: a ingestão e a validação vêm **antes** dos schemas e do frontend. Duas decisões de interface — rosca exclusiva e paleta principal — dependiam de premissas que só o conjunto ingerido confirma, e a validação de fato derrubou a primeira. Construir a interface primeiro teria significado refazê-la.
