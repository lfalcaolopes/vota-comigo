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

| Campo da fonte | Uso |
| --- | --- |
| `ideCadastro` | Identificador do deputado usado para resolver a FK interna `deputado_id`. |
| `numSubCota` | Código oficial da categoria da despesa. |
| `txtDescricao` | Descrição oficial da categoria. |
| `vlrLiquido` | Valor efetivamente debitado da cota antes de eventual restituição posterior. |
| `vlrRestituicao` | Valor posteriormente devolvido à Câmara. Campo vazio equivale a zero para a agregação. |
| `numMes` | Mês de competência financeira da despesa. |
| `numAno` | Ano de competência financeira da despesa. |
| `sgUF` | Estado pelo qual o deputado foi eleito, usado para a mediana da UF. |

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

### Unidade persistida

A menor unidade persistida é:

```text
deputado + ano + mês + categoria
```

Para cada combinação, a ingestão soma o valor utilizado dos registros da fonte.

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

## Persistência proposta

A tabela conceitual `deputado_ceap_monthly_category` contém:

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | Surrogate key interna. |
| `deputado_id` | `uuid` | FK para `deputado.id`. |
| `year` | `integer` | Ano de competência. |
| `month` | `integer` | Inteiro entre 1 e 12. |
| `external_num_sub_cota` | `integer` | Código `numSubCota` da fonte, conforme ADR 007. |
| `source_description` | `text` | Descrição oficial da categoria no arquivo anual. |
| `amount_used` | `numeric(..., 2)` | Soma de `vlrLiquido - vlrRestituicao`. |

Restrição única:

```text
(deputado_id, year, month, external_num_sub_cota)
```

Índices de leitura:

```text
(deputado_id, year)
(deputado_id, year, month)
```

### Cobertura por ano

A fronteira do dado é propriedade do **arquivo anual**, não de um deputado, então mora em tabela própria — uma linha por ano carregado:

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `year` | `integer` | Ano de competência, único. |
| `covered_through_month` | `integer` | Último mês coberto pelo arquivo, entre 1 e 12. |
| `ingested_at` | `timestamptz` | Momento da substituição anual. |

`covered_through_month` é derivado na ingestão como o maior `numMes` presente no arquivo daquele ano, sobre todos os deputados — não por deputado, senão um parlamentar sem gasto em dezembro faria dezembro virar lacuna para ele. Anos encerrados e completos gravam `12`.

Sem essa tabela, a interface não consegue distinguir "não gastou" de "não carregado", e cai no problema descrito em [Fronteira do dado](#fronteira-do-dado).

### Mediana por UF e ano

A mediana é **pré-calculada na ingestão**, não no request. Calculá-la em runtime exigiria somar os agregados mensais de todos os deputados de um estado — dezenas de milhares de linhas por leitura de perfil, no free tier. Como a ingestão já faz substituição anual completa, derivar a mediana ali é praticamente de graça e torna a leitura O(1).

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `year` | `integer` | Ano de competência. |
| `sigla_uf` | `text` | UF vinda de `sgUF` no arquivo. |
| `median_amount_used` | `numeric(..., 2)` | Mediana dos totais anuais. |
| `deputado_count` | `integer` | Quantos deputados entraram no cálculo. |

Único em `(year, sigla_uf)`. Entram apenas deputados que exerceram o ano inteiro, conforme a regra de exercício parcial. `deputado_count` é publicado junto com a mediana: uma mediana sobre três deputados não merece a mesma confiança que uma sobre setenta, e esconder o denominador esconde isso.

A UF de cada deputado no ano também precisa ser persistida, já que os agregados mensais não a carregam — uma linha por `(deputado_id, year)` com a `sigla_uf` do arquivo, na ordem de 10 mil linhas no total.

Os nomes desta tabela e das anteriores ainda precisam de uma passada da ADR 007 na implementação: `deputado_ceap_monthly_category` mistura sigla de domínio com substantivos genéricos em inglês, e a convenção do repositório não foi conferida contra ela.

## Ingestão

### Download

Chamar a CEAP de "fonte específica" subestima a mudança. Hoje `buildCsvDownloadPlan` monta toda URL por uma fórmula única, a partir de um só host:

```ts
url: `${baseUrl}/${dataset}/csv/${filename}`
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

A rosca é a **única** representação da distribuição anual. Não há caminho alternativo em lista de barras, e não há regra condicional escolhendo entre os dois. Construir os dois significaria manter um caminho que quase nunca dispara e que, por isso, quase nunca é exercitado em uso real.

Isso depende de uma premissa ainda não verificada, registrada em [Pendências de validação](#pendências-de-validação): que agregados negativos não ocorrem no recorte efetivamente exibido. Uma rosca com fatia negativa, ou com total anual não positivo, é matematicamente enganosa — o ângulo de uma fatia não representa valor negativo. Se a validação encontrar negativos, esta decisão reabre.

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

A cor é atribuída por **`numSubCota`**, a partir de uma paleta fixa, e nunca por posição no ranking.

Atribuir por posição faria a mesma cor significar categorias diferentes ao trocar de ano, já que o top 5 é calculado por deputado e por ano. É o mesmo defeito que a regra do top 5 anual evita no eixo mensal — o doc já argumenta que recalcular por mês "faria cores e legendas mudarem de significado" —, só que um nível acima. E o dano é maior aqui: quem troca de ano está procurando mudança de comportamento, e cor remapeada inventa mudança onde não houve.

Fixar cor para as 19 categorias é inviável: não existem 19 cores distinguíveis com contraste acessível. A saída é uma paleta fixa para as categorias que dominam nacionalmente, com todo o resto caindo em **Outras despesas**. Isso depende de uma premissa a verificar, registrada nas [Pendências de validação](#pendências-de-validação).

- Uma cor representa a mesma categoria em todos os gráficos, deputados e anos.
- **Outras despesas** usa sempre uma cor neutra.
- Categoria fora da paleta fixa que apareça em um top 5 herda a cor neutra e é distinguida pela legenda e pela alternativa textual, nunca pela cor.
- Cores não representam avaliação positiva, negativa, partido ou ideologia.
- Segmentos adjacentes mantêm contraste perceptível.
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

## Pendências de validação

Itens que precisam ser verificados contra o conjunto completo ingerido, **antes** de fechar a implementação. Nenhum deles está resolvido hoje; a evidência atual vem apenas do arquivo de 2025.

**1. Agregados negativos no recorte exibido.** Bloqueia a rosca. É preciso varrer todos os anos ingeridos e responder, para o recorte que a interface efetivamente desenha — as cinco maiores categorias anuais mais **Outras despesas**, por deputado e por ano, e também por mês:

- existe algum agregado **anual** por grupo com valor negativo?
- existe algum agregado **mensal** por grupo com valor negativo?
- existe algum total anual por deputado que não seja positivo?

Resposta negativa em todos: a rosca exclusiva se sustenta como está. Qualquer ocorrência reabre a decisão — as opções são voltar à lista de barras ou definir uma regra de domínio documentada para o caso.

Vale notar que a agregação em **Outras despesas** pode absorver um negativo dentro de um grupo positivo, e que o recorte exibido é mais grosso que o recorte da evidência atual (que mediu categorias individuais, não os seis grupos). A varredura precisa medir os grupos de apresentação, não as categorias cruas.

**2. Armazenamento no Neon.** O free tier tem 0,5 GB e o dump atual já ocupa ~91 MB. Estimar as linhas de `2008..ano corrente` na granularidade deputado + ano + mês + categoria antes de ingerir tudo, e confirmar a folga.

**3. Tamanho de amostra da mediana nas UFs pequenas.** Estados com bancada reduzida, filtrados ainda por exercício de ano inteiro, podem produzir medianas sobre um punhado de deputados. Levantar o menor `deputado_count` por `(year, sigla_uf)` após a ingestão completa e definir um piso abaixo do qual a comparação não é exibida.

**4. Periodicidade real da fonte.** A afirmação de que o arquivo é atualizado diariamente circula, mas a página oficial de descrição dos dados da CEAP **não declara periodicidade alguma**. Como a fronteira do dado depende disso, convém observar o arquivo por alguns dias e registrar o comportamento real em vez de assumir.

**5. Concentração das categorias no top 5.** Define o tamanho da paleta fixa. Sobre o conjunto completo, levantar:

- quantas `numSubCota` distintas aparecem em algum top 5, considerando todos os deputados e anos;
- que fração dos pares deputado-ano é coberta pelas N mais frequentes, para N de 5 a 10;
- com que frequência o conjunto do top 5 muda entre anos consecutivos do mesmo deputado.

Se um punhado de categorias cobrir a esmagadora maioria, a paleta fixa se sustenta. Se o conjunto for disperso, a alternativa é calcular o top 5 pela união dos anos do deputado — série estável para aquele deputado, ao custo de o top 5 de um ano deixar de ser exatamente o top 5 daquele ano.

**6. Invariantes por ano, não só em 2025.** A relação um-para-um entre `numSubCota` e `txtDescricao`, a cobertura de `ideCadastro` e o conjunto de códigos foram verificados apenas no arquivo de 2025. A ingestão valida isso por arquivo, mas convém saber de antemão quais anos falham.

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
- A distribuição anual usa exclusivamente a rosca, sem caminho alternativo.
- Meses além da cobertura do dado aparecem como sem dados, não como zero, e ficam fora do total.
- A seção exibe o carimbo de cobertura da fonte.
- O total anual aparece acompanhado da mediana da UF no ano e do número de deputados no cálculo.
- A mediana considera apenas deputados que exerceram o ano inteiro.
- Deputado com exercício parcial no ano não recebe comparação, e sim o período exercido.
- Nenhum pró-rata é aplicado a gastos de exercício parcial.
- A seção exibe a ressalva de que a cota varia por estado.
- As pendências de validação foram executadas contra o conjunto completo antes do fechamento.
- Estados de carregamento, ausência de dados e falha não alteram o restante do perfil.
- Testes de navegador cobrem troca de ano, seleção por toque e navegação por teclado.

## Sequência recomendada de implementação

1. generalizar o plano do downloader (construtor de URL e extração por dataset), mantendo as URLs dos datasets atuais idênticas;
2. implementar o download e a extração da fonte CEAP;
3. adicionar tabelas e migrações: agregados mensais por categoria, cobertura por ano, UF por deputado-ano, mediana por UF-ano;
4. implementar o passo anual de ingestão, suas invariantes, a cobertura e a mediana;
5. **executar as [Pendências de validação](#pendências-de-validação) contra o conjunto completo** — os resultados podem reabrir a rosca exclusiva e a paleta fixa, então isso vem antes do frontend;
6. adicionar schemas e tipos compartilhados, já com `status`, cobertura e mediana estabilizados pelo passo anterior;
7. implementar repositório, serviço e endpoint dos gastos da cota;
8. implementar transformação pura de top 5 mais **Outras despesas**;
9. implementar seletor de ano, os três estados e o carimbo de cobertura;
10. adicionar os gráficos com Recharts e alternativa textual acessível;
11. validar responsividade, teclado, toque, valores negativos e a fronteira do dado com Playwright.

A ordem mudou de propósito: a ingestão e a validação vêm **antes** dos schemas e do frontend. Duas decisões de interface — rosca exclusiva e paleta fixa — dependem de premissas que só o conjunto completo confirma. Construir a interface primeiro arriscaria refazê-la.
