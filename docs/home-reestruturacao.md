# Reestruturação da home

Referência de implementação para a nova home. Registra a estrutura decidida, de
onde vem cada dado, o contrato do endpoint que falta e as armadilhas que já
custaram uma versão descartada.

Status: implementada na branch `final-touches`. A seção "Estado do código" diz
onde cada peça mora.

## Por que a home muda

A home foi escrita quando o comparativo era a única função do site, e ficou
sendo uma página institucional sobre ele: de cinco seções, três eram texto sobre
o método e duas eram chamada para ação. O único dado real na página eram três
proposições. Deputados, que é onde os usuários passam mais tempo nos testes, não
aparecia em lugar nenhum.

Ao mesmo tempo, features que existem há tempo nunca foram expostas: a
discriminação dos gastos da cota, a ordenação por menor uso da cota, a busca de
proposições por assunto, os resumos por IA e o comparativo entre deputados.

## A tese da página

**Cada seção é um gancho com fato real que aponta para a profundidade, em vez de
ser meia feature embutida na home.**

Essa frase é o critério de aceitação de qualquer seção nova. A primeira tentativa
de reestruturação falhou justamente por ignorá-la: pegou a lista de features
subexploradas e transformou cada item numa seção, produzindo um agregado de meias
features sem transição nem contexto. Uma lista de features é insumo para a tese,
nunca o índice da página.

Três sintomas concretos daquela versão, que servem de teste para a próxima:

1. **Sem espinha.** O hero falava de concordância de voto e a seção seguinte, de
   gasto de cota. Dois eixos que não se tocam. Adjacência não é fluxo.
2. **Portas tratadas como alternativas.** O resultado do matcher é uma lista de
   deputados e o perfil é onde se cai depois. São o mesmo percurso em dois níveis,
   não dois produtos concorrentes.
3. **Gramática única.** Título, subtítulo, link à direita, conteúdo, quatro vezes.
   Mesmo com a ordem certa, a página lê como lista porque nada sinaliza movimento.

## Estrutura

Ordem: hero, gastos da cota, propostas, comparar.

### 1. Hero

Afirmação do produto, ação primária única e uma linha de origem dos dados.

- Ação primária: `Fazer comparação`, para `/matcher`. É a única ação com peso de
  botão primário no corpo da página.
- Ação secundária: `Ver deputados`, para `/deputados`.
- Linha de origem: os dados vêm dos dados abertos da Câmara, com link para
  `/metodologia`. Rótulo do link fala em "conta", não em "metodologia".
- Espinha da página: o subtítulo declara os dois registros públicos do mesmo
  deputado, como votou e quanto gastou. É a frase que impede a seção de cota de
  chegar como desvio de assunto; sem ela, a página reproduz o sintoma 1.
- Âncora à direita: a figura `Como o resultado aparece`, com o selo `Exemplo`.

A figura é fabricada por necessidade: um percentual real depende das respostas do
usuário, então não existe versão real dela numa página anônima. O selo `Exemplo`
não é opcional. Ela **não** pode voltar como `hidden lg:block`: no celular, que é
o canal principal, isso apagava metade do hero. No mobile ela empilha abaixo do
texto.

### 2. Gastos da cota no último mandato

O gancho da página. Mostra o total agregado gasto em cota parlamentar na
legislatura e a discriminação por rubrica, para que a decisão de voto chegue
dimensionada.

O sujeito do título é o deputado, o mesmo do hero, e não a despesa: é o que
costura as duas seções por estrutura em vez de por uma frase de ligação.

"Legislatura" saiu do texto de tela; continua nos identificadores, que seguem a
ADR 007. O recorte no título é o ano de início, tirado de `periodStart` com
`slice(0, 4)`, e o skeleton recebe `anoInicio: null` porque ainda não tem o dado
— o título encolhe, nunca inventa o ano. **Aproximação em anos não serve aqui.**
"Nos últimos 4 anos" seria falso: a janela fev/2023 a ago/2026 dá 3 anos e 6
meses, e cresce a cada mês carregado.

- Total agregado da legislatura, em reais.
- Discriminação por rubrica, com valor e participação de cada uma. A cauda para
  no total de `Outras despesas`: a composição dela é assunto do perfil, não da
  home, que é gancho e não tela de análise.
- Cobertura declarada, sempre derivada do dado, nunca cravada em string.
- Ficha do total em duas linhas de mesmo formato, `rótulo: valor`: "Período
  analisado" e "Deputados considerados". A explicação longa sobre passar das 513
  cadeiras saiu, e o link para o método também: a home já liga para
  `/metodologia` no hero, e repetir a ligação ao lado do número não acrescenta.
- Ao pé, um caminho só: a discriminação dos gastos dentro do perfil de um
  deputado, em `/deputados`.

A seção é de duas colunas no desktop: o número na lateral e a discriminação ao
lado. Para a coluna da esquerda não sobrar vazia, ela carrega a definição da cota,
que por isso **não** fica no cabeçalho — o `h2` vem sozinho, e o parágrafo desce
para debaixo do número que ele explica.

O `h2` tem `max-w-[30ch]` para quebrar sempre em duas linhas, de 480px para cima.
Abaixo disso a própria viewport é mais estreita que a medida, e o título passa a
três linhas em 390px: caber em duas ali exigiria diminuir a fonte só desta seção,
quebrando a escala que os outros `h2` da home usam.

**A largura de 21rem é medida, não escolhida.** Varrendo de 16 a 24rem: abaixo de
21rem o total quebra depois do "R$", e acima de 22rem um segundo rótulo de rubrica
passa a quebrar. Os rótulos só param de quebrar de vez com 17rem ou menos, largura
em que o total não cabe. Não existe valor que resolva os dois, então 21rem é o
ponto que preserva o número inteiro e deixa um único rótulo em duas linhas. Quem
mexer nessa medida precisa refazer a varredura, não estimar.

Depende do endpoint descrito adiante. Sem agregado disponível a seção não sobe:
a home fica completa sem ela.

**Esta seção substitui o ranking de menor uso da cota**, que foi implementado e
descartado. Motivo em "Armadilhas".

### 3. Propostas

Sem campo de busca na home. A busca é _referenciada_, não embutida.

- Explicação curta do que dá para procurar.
- Termos prontos, clicáveis, que levam para `/proposicoes?q=<termo>`. São eles que
  demonstram que a busca aceita assunto em vez de número.
- Referência ao selo de resumo por IA, explicando que onde ele aparece a proposta
  vem com um resumo curto no lugar do texto oficial.
- Abaixo, algumas propostas mais votadas, para a pessoa já ver o formato do que
  encontra do outro lado. O caminho para a lista completa vem depois delas, não
  antes: link acima da lista é atalho para fora sem a pessoa ter visto o que tem
  dentro.

O título tem o deputado como sujeito, igual ao hero e à cota, e a abertura entrega
a seção para o fecho dizendo que é dali que a comparação sai. Uma seção só de
recorte, sem subtítulo próprio: a versão anterior tinha quatro blocos de texto
antes da primeira linha de dado e repetia o escopo no `h2` e no `h3`.

**Proposta votada muitas vezes não é voto que entra na conta.** O contador
`Votações em plenário` soma todas as votações ligadas à proposição, inclusive as
processuais, enquanto o matcher usa uma votação de mérito por proposição (ADR 014
e `docs/matcher/votacao-referencia.md`). Por isso a abertura diz "a votação que
decidiu o mérito": qualquer texto que sugira que as 43 votações de uma PEC entram
na comparação é falso.

O texto **não pode anunciar** que a busca entende linguagem comum. Ver
"Regras de texto".

### 4. Comparar

Fecho da página, sobre comparação em geral, com os dois modos:

- **Pelas suas posições**: o matcher. Continua sendo a ação primária da página.
- **Entre deputados**: dois ou três lado a lado, com dados gerais.

Um assunto, uma ação principal, um caminho secundário nomeado. O comparativo entre
deputados ganha espaço próprio no fecho, mas não vira um segundo botão primário
disputando com o matcher no exato ponto em que a decisão é pedida. Ele é um botão
`secondary`: tem borda e caixa, mas não tem `bg-primary`. As duas colunas são
`flex` de altura igual com `mt-auto` no rodapé, para os dois botões ficarem na
mesma linha independentemente do tamanho dos parágrafos.

**O comparativo entre deputados não mostra voto.** As linhas são presença
registrada, propostas assinadas, comissões e órgãos, e gasto da cota parlamentar
(`comparativo-deputados-grid.ts`). O voto aparece no matcher e no perfil, não ali.
O texto do fecho já prometeu voto uma vez; há um teste de unidade que falha se a
promessa voltar.

O sujeito muda aqui de propósito. Hero, cota e propostas têm o deputado como
sujeito; o fecho passa para "você", e é essa virada que sinaliza a entrega do
comando. O título nomeia o momento do leitor em vez de anunciar a estrutura da
própria seção.

**O fecho não reexplica o que é a comparação.** Hero e propostas já dizem, e a
terceira ocorrência é justamente o que o guia de linguagem manda cortar. O bloco
do matcher carrega só o que ainda é novo, que são as objeções que travam o clique:
poucos minutos, sem cadastro, respostas no navegador. Há um teste de unidade que
falha se a explicação voltar.

## Contrato do endpoint que falta

O agregado da cota não existe hoje. `/deputados/:externalIdDeputado/ceap?year=`
devolve um deputado por vez, por ano.

Rota:

```
GET /cota/legislatura
```

`agregado` saiu do nome: é palavra genérica, e a ADR 007 só admite substantivo do
domínio em português. O recurso é a cota da legislatura em curso, e é isso que a
rota diz.

Resposta, com nomes espelhando `deputadoCeapLoadedResponseSchema` para que as duas
telas usem o mesmo vocabulário:

```ts
{
  legislatura: number;
  periodStart: string; // ISO date, derivada do dado
  coberturaAte: string; // ISO date, derivada de cota_cobertura
  deputadoCount: number;
  totalAmountUsedCents: number;
  categories: Array<{
    externalNumSubCota: number;
    description: string;
    amountUsedCents: number;
  }>;
}
```

O schema mora em `@vota-comigo/shared-types` como `cotaLegislaturaResponseSchema`
mais o `z.infer`, e é importado dos dois lados.

`categories` vem ordenada por valor decrescente, porque a tela lê a rubrica pelo
peso e não pelo código. `deputadoCount` conta quem entrou na soma — inclui suplentes
e substituições da legislatura inteira, então é maior que o número de cadeiras.

Sem dado suficiente para a legislatura em curso — nenhum mês carregado, ou buraco
no meio da janela — a rota responde `404`, e a seção não sobe. Não existe agregado
zerado: zero e lacuna nunca são apresentados da mesma forma.

### Como calcular

Os dados estão em `deputado_gasto_cota`, uma linha por deputado e ano, com
`gastos_json` no formato `{ mês: { numSubCota: centavos } }`. As passagens aéreas
SIGEPA ficam à parte, em `deputado_gasto_cota_sigepa`.

**Um `SUM` ingênuo produz um número errado.** Dentro da janela de reposição, a
categoria 998 vem da reposição e as linhas do dump são descartadas: é substituição,
não soma, porque o dump ainda publica estornos negativos de 998 na janela e somar
as duas fontes contaria o estorno duas vezes. A regra já existe em
`applyReposicaoSigepa`, em `apps/api/src/shared/cota/reposicao-sigepa.ts`, e é
governada pela ADR 022.

Passos:

1. Derivar os anos da legislatura a partir do dado, nunca cravar.
2. Carregar as linhas de `deputado_gasto_cota` e `deputado_gasto_cota_sigepa` dos
   anos da janela.
3. Aplicar `applyReposicaoSigepa` por deputado e por ano, usando
   `cota_cobertura.sigepa_reposto`.
4. Somar por rubrica e no total.
5. Devolver a cobertura a partir de `cota_cobertura`, para que a tela consiga
   dizer até quando o número vale.

Ano da janela que ainda não teve a passagem aérea SIGEPA reposta encerra a janela
no mês anterior à lacuna, em vez de entrar na soma. Somá-lo devolveria um total
menor sem dizer que é menor; truncando, `coberturaAte` encolhe junto e a tela
continua declarando até onde o número vale.

O total do agregado tem que fechar com a soma dos perfis. Duas contas divergentes
para o mesmo dado, na mesma aplicação, destroem a auditabilidade que é o princípio
número um do produto.

Ordem de grandeza para dimensionar a consulta: pouco mais de 500 deputados por
ano de legislatura, algo em torno de 2000 linhas. Cabe em memória, mas a home é
`force-dynamic` e a agregação não deve ser refeita a cada request.

## Regras de texto

Todo texto de tela segue `docs/linguagem-da-interface.md`. Três pontos que já
morderam nesta página:

- **Não anunciar que a busca entende linguagem comum.** O guia proíbe
  explicitamente escrever que o texto está "em linguagem comum". A capacidade se
  demonstra pelos termos de exemplo, não se afirma. Há um teste de unidade que
  falha se a frase voltar.
- **"proposta" na tela, `proposicao` no código.** A divergência é deliberada e vale
  só na camada de texto. O componente se chama `HomeProposicoes` e a tela diz
  "Propostas". ADR 007 governa o identificador, o guia de linguagem governa o
  rótulo.
- **Nada de data cravada.** Cobertura, período e contagem saem do dado. A versão
  antiga da home afirmava "de 2015 até agosto de 2026" em string.

Rótulo de link usa "conta" ou "cálculo", não "metodologia". Cada link precisa de
sentido isolado: dois links diferentes na mesma página não podem ter o mesmo texto.

## Armadilhas

A home **não** oferece mais o atalho para `?sort=menor-uso-cota`. A ordenação
continua existindo na lista de deputados; o que saiu foi o convite a começar por
ela numa página onde não cabe a ressalva que ela exige. Um teste de unidade falha
se o link voltar.

**O ranking de menor uso da cota engana.** Em 2026-08-20, os cinco primeiros de
`/deputados/feed?sort=menor-uso-cota&emAtividade=true` incluíam 0% com 53 dias em
exercício, 9% com 139 dias e 14% com 82 dias. Quem ficou pouco tempo no exercício
gasta pouco e sobe no ranking. A ordenação está correta; a leitura de "deputado
econômico" é que é falsa. Foi uma das razões para trocar o ranking pelo agregado.

Se algum dia esse recorte voltar a alguma superfície, ele precisa de ressalva no
ponto de uso ou de um filtro de mandatos comparáveis na API. Um filtro que exista
só numa tela cria duas listas divergentes para a mesma pergunta, o que é pior.

**A `/metodologia` já cobre o que saiu da home.** Antes de apagar os blocos "Como
funciona" e "Como a conta é feita, e até onde ela vai", foi verificado que
"De onde vêm os dados", "Limites" e "Ordenação por menor uso da cota" já diziam a
mesma coisa. Método não sumiu da home, mudou de forma: em vez de bloco genérico,
ressalva colada ao número que ela explica.

**Cuidado com o placar.** O `PRODUCT.md` lista "placar esportivo de torcida" como
anti-referência. Qualquer lista ordenada de políticos por um número tende para lá,
e uma frase de ressalva perde para uma lista: as pessoas leem os nomes e a
porcentagem, não o parágrafo acima.

## Estado do código

| Arquivo                                              | Papel                                                     |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `features/home/components/home-hero.tsx`             | Hero com a âncora `HomeResultadoSample` à direita         |
| `features/home/components/home-resultado-sample.tsx` | A figura `Como o resultado aparece`, com o selo `Exemplo` |
| `features/home/components/home-cota-legislatura.tsx` | Seção de gastos da cota, sobre `GET /cota/legislatura`    |
| `features/home/components/home-proposicoes.tsx`      | Seção de propostas, sem campo de busca                    |
| `features/home/components/home-comparar.tsx`         | Fecho `Comparar`, com os dois modos                       |
| `shared/cota/queries.ts`                             | `cotaLegislatura()`, o cliente do endpoint                |
| `shared/ui/selection.tsx`                            | `ChipLink`, que compartilha as classes do `Chip`          |
| `shared/navigation/app-header.tsx`                   | Nav reordenada: Deputados, Propostas, Metodologia         |

A discriminação por rubrica reusa o que o perfil já tem: `deriveGastoCotaDistribuicao`
recorta as cinco maiores e agrupa a cauda em `Outras despesas`, e `applyGastoCotaPaleta`
dá a cor. `GastoCotaComposicao`, que abre a cauda num `details`, ficou só no perfil.
A participação de cada rubrica saiu de dentro daquele componente para
`formatGastoCotaParticipacao`, em `gasto-cota-presentation.ts`, para que as duas telas
dividam a mesma conta. A seção
inteira é server component: nenhum gráfico de `recharts` entra na home.

Falha ou `404` no endpoint devolve `null` e a seção não renderiza — não existe
agregado zerado na tela.

Do lado da API, `GET /cota/legislatura` está implementado em `apps/api/src/cota/`,
com a mecânica de janela mensal extraída para `shared/cota/mes-cota.ts` e
compartilhada com `deriveUsoCota` — é o que impede duas contas divergentes para o
mesmo dado. O total foi conferido contra uma soma independente em SQL sobre
`deputado_gasto_cota` e `deputado_gasto_cota_sigepa`, e bate ao centavo.

`/metodologia` tem a âncora `#gastos-cota` no painel "Gastos da cota parlamentar".
Nada na home aponta mais para ela desde que o link saiu da ficha do total; a âncora
ficou porque continua servindo para link direto de fora.

Removidos: `home-como-funciona.tsx`, `home-transparencia.tsx`, `home-em-votacao.tsx`,
`home-hero-sample.tsx`, `home-uso-cota.tsx` e `home-cta.tsx` — o fecho virou
`home-comparar.tsx`, porque o nome do arquivo segue o que a seção é.

Testes em `features/home/tests/` e `e2e/home.spec.ts`.

## Fora de escopo

- Busca por nome de deputado na home. Provavelmente serve mais ao comportamento
  observado nos testes do que o recorte de cota servia, mas dois campos de busca na
  mesma página transformam a home em portal e diluem a ação primária. Decisão
  adiada de propósito.
- Filtro de mandatos comparáveis na ordenação por uso da cota.

## Verificação

Além das suítes, esta página precisa ser olhada em 1280px e em 390px antes de ser
dada por pronta. Três defeitos da última rodada só apareceram na captura: a medida
do `h1` no hero, o alinhamento do link da seção de cota e o placeholder que
truncava no celular.
