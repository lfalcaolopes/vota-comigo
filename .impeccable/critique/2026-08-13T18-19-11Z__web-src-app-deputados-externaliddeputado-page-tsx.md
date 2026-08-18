---
target: apps/web/src/app/deputados/[externalIdDeputado]/page.tsx
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-08-13T18-19-11Z
slug: web-src-app-deputados-externaliddeputado-page-tsx
---
## Design Health Score

| # | Heurística | Nota | Questão principal |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 3/4 | Skeletons e erros parciais funcionam bem, mas quatro blocos assíncronos fazem a página parecer incompleta por bastante tempo. |
| 2 | Correspondência com o mundo real | 3/4 | A linguagem é cuidadosa, mas “Atual” é ambíguo em mandatos encerrados e contagens podem sugerir produtividade. |
| 3 | Controle e liberdade | 3/4 | Ano e gráficos são controláveis; listas extensas não podem ser recolhidas e o usuário não escolhe entre resumo e detalhe. |
| 4 | Consistência e padrões | 4/4 | Tipografia, divisores, links, foco e estados seguem o sistema do produto. |
| 5 | Prevenção de erros | 3/4 | Há boas ressalvas metodológicas, mas elas competem com textos redundantes e perdem destaque. |
| 6 | Reconhecimento em vez de memorização | 3/4 | Rótulos e fontes são explícitos; a repetição de detalhes dificulta reconhecer os poucos sinais centrais. |
| 7 | Flexibilidade e eficiência | 2/4 | A tela favorece investigação completa mesmo quando o usuário quer apenas formar uma impressão rápida. |
| 8 | Design estético e minimalista | 2/4 | O visual é sóbrio, porém a página de pior caso mede 4.710 px no desktop e 6.579 px no mobile. |
| 9 | Recuperação de erros | 3/4 | Erros isolam cada seção e preservam o restante do perfil. |
| 10 | Ajuda e documentação | 4/4 | Fontes e limitações ficam próximas aos dados, com boa rastreabilidade. |
| **Total** | | **30/40** | **Boa base, arquitetura de informação sobrecarregada** |

## Veredito de anti-padrões

**Avaliação de design:** a página não parece gerada por IA. Ela é sóbria, plana e coerente com a “Mesa de Apuração Pública”. O problema é o excesso de zelo documental: resumo, metodologia e arquivo aparecem simultaneamente, fazendo a interface parecer um relatório bruto da Câmara.

**Detector determinístico:** nenhum achado nos nove arquivos analisados. Não houve falso positivo. O detector não mede comprimento, relevância ou densidade semântica, por isso não captura o principal problema desta tela.

**Evidência visual:** capturas headless em 1280 px e 390 px confirmaram a leitura. Não houve overlay visível ao usuário porque a sessão não expõe uma aba mutável/apresentável do Browser; as capturas desktop e mobile foram usadas como sinal alternativo.

## Impressão geral

A parte superior do perfil funciona: identidade, presença, dados públicos e fonte oficial permitem formar uma impressão confiável. A experiência perde direção depois de “Atuação na Câmara”. O maior ganho virá de separar duas tarefas: entender a atuação ao longo do tempo e auditar os registros de um ano.

## O que funciona

- **Neutralidade e rastreabilidade:** termos como “proposições assinadas” e as ressalvas de órgãos evitam atribuir autoria ou produtividade que a fonte não demonstra.
- **Acessibilidade dos gráficos:** o donut tem alternativa textual, interação por teclado e retorno em `aria-live`; o total no centro já comunica o valor sem depender do bloco textual duplicado.
- **Resiliência:** cada fonte anual pode falhar isoladamente, com skeletons e mensagens que mantêm o restante do perfil utilizável.

## Avaliação das alterações propostas

### 1. Histórico partidário

**Concordo, com um refinamento.** Exibir o vínculo mais recente e um controle “Ver histórico completo (8 anteriores)” resolve o pior caso sem esconder que houve mudanças. Para mandato encerrado, “Atual” deve virar “Último registro”, porque o vínculo está aberto na fonte, mas o deputado não está em atividade. Se houver apenas um período, o controle não aparece.

### 2. Verbosidade dos blocos anuais

**Concordo seletivamente.** Remover “Selecione o ano...” e textos que repetem títulos. Preservar informações que impedem interpretação errada, mas mudar sua forma:

- definição da CEAP e variação do teto: ajuda contextual curta;
- exercício parcial e cobertura: legenda junto do gráfico ou detalhe metodológico;
- “proponente ou apoiador”: precisa ficar junto da contagem de proposições;
- órgãos não demonstram presença ou produtividade: ressalva essencial, não deve desaparecer;
- origem de sumário e assuntos de discursos: deixa de ser necessária se a lista detalhada sair da visão principal.

### 3. Gastos da cota parlamentar

**Concordo.** O total já está no centro do donut, então o bloco “Total utilizado” é duplicação. A mediana deve ficar como contexto do gráfico, em uma legenda compacta sob o donut: “Mediana de 63 deputados de MG com ano completo: R$ X”, idealmente acompanhada da diferença percentual sem cor normativa. Em exercício parcial, não inventar comparação; manter o período de exercício e a explicação de indisponibilidade da mediana.

### 4. Outras despesas

**Concordo.** “Outras despesas” deve continuar agregada no gráfico para preservar legibilidade, mas ser expansível na legenda. Ao abrir, mostra as categorias reunidas, valor e porcentagem. A implementação atual descarta essa composição ao derivar a série, então o modelo de apresentação precisa preservar `remaining`, embora a API já entregue todas as categorias.

### 5. Gastos mensais

**Concordo com a remoção completa da visão principal.** O gráfico, os dois filtros, o painel de seleção e a tabela respondem a uma pergunta secundária e consomem grande parte da página. O gráfico anual já cobre a pergunta principal: quanto foi usado e em quais categorias. Não manter filtros ou tabela escondidos apenas por inércia; se no futuro houver evidência de demanda investigativa, isso pode virar uma rota ou detalhe próprio.

### 6. Proposições assinadas e discursos

**Concordo com substituir listas por uma visão anual agregada, mas não chamaria isso de nível de atividade ou produtividade.** Uma assinatura pode ser de proponente ou apoiador; discurso registrado não mede impacto legislativo. A forma recomendada é “Registros por ano”, com linhas anuais e rótulos literais:

`2018 · 364 de 443 votações com participação · 5 proposições assinadas · 1 discurso registrado`

O sinal mais relevante deve ser participação em votações, pois está alinhado ao propósito do produto e já existe em dados ingeridos. Proposições e discursos entram como contexto secundário. Cada definição permanece acessível perto do cabeçalho, e detalhes individuais podem ser removidos ou oferecidos sob demanda sem ocupar a página inicial.

Não implementar essa visão disparando os endpoints atuais para cada ano. Hoje proposições exigem pelo menos quatro consultas trimestrais por ano, além de paginação; um mandato longo multiplicaria latência e risco de rate limit. É necessário um contrato agregado do backend, com cache ou dados ingeridos, que entregue todos os anos em uma chamada.

### Dados adicionais com melhor potencial

1. **Participação em votações por ano:** melhor sinal para o produto. Mostrar amostra e período em exercício, nunca apenas percentual.
2. **Proposições como primeiro signatário ou proponente:** mais informativo que assinaturas amplas, mas exige consultar autores de cada proposição ou ingerir `proposicoesAutores`; não está no contrato atual.
3. **Papéis em órgãos:** quantidade de presidências, titularidades e suplências por ano pode resumir responsabilidade formal, com ressalva de que não mede presença ou contribuição.
4. **Temas de proposições e discursos:** tecnicamente disponíveis por temas oficiais e `keywords`, mas têm cobertura e qualidade desiguais; servem como navegação, não como inferência de posição política.
5. **Eventos:** deixar para depois. A API descreve participação prevista e os arquivos de presença têm semântica temporal delicada; não é um sinal seguro para a primeira versão do resumo.

## Questões prioritárias

### [P1] A visão anual é arquivo antes de ser resumo

**Por que importa:** no canal mobile principal, o usuário percorre 6.579 px para atravessar uma única seleção anual. A informação central se perde entre listas e controles de exploração.

**Correção:** criar “Registros por ano” como visão padrão e carregar detalhes apenas sob demanda. Remover a exploração mensal e as listas integrais da leitura inicial.

**Comando sugerido:** `$impeccable distill`

### [P1] O agregado pode virar um placar enganoso

**Por que importa:** mais discursos ou assinaturas não significa melhor atuação. Um ranking implícito contrariaria a neutralidade e as decisões metodológicas já documentadas.

**Correção:** usar rótulos literais, priorizar participação em votações com denominador e nunca somar sinais heterogêneos em uma nota. Criar um endpoint agregado em vez de N consultas por ano.

**Comando sugerido:** `$impeccable shape`

### [P2] A CEAP repete o total e separa a mediana do gráfico

**Por que importa:** a duplicação aumenta a hierarquia sem acrescentar informação, enquanto o benchmark relevante parece nota de rodapé.

**Correção:** manter o total apenas no donut, posicionar mediana e cobertura na legenda contextual e tornar “Outras despesas” expansível.

**Comando sugerido:** `$impeccable layout`

### [P2] Histórico partidário não escala e “Atual” é ambíguo

**Por que importa:** nove períodos ocupam quase a mesma altura que todo o resumo do perfil; em mandato encerrado, “Atual” parece afirmar filiação presente.

**Correção:** mostrar o período mais recente, revelar os anteriores por controle nativo acessível e usar “Último registro” para deputados inativos.

**Comando sugerido:** `$impeccable clarify`

### [P2] Ressalvas essenciais e texto redundante têm o mesmo peso

**Por que importa:** o usuário aprende a ignorar todos os subtítulos e pode perder justamente as limitações que evitam interpretações erradas.

**Correção:** apagar instruções óbvias e mover ressalvas para legendas, ajuda contextual ou detalhes metodológicos próximos do dado correspondente.

**Comando sugerido:** `$impeccable clarify`

## Alertas por persona

**Cidadão chegando por WhatsApp no celular:** entende presença e identidade rapidamente, mas depois encontra histórico partidário com nove linhas e uma sequência longa de gastos, proposições, órgãos e discursos. É provável que abandone antes de comparar anos.

**Eleitor que quer auditar uma afirmação:** encontra fontes e registros completos, ponto forte da tela, mas não consegue primeiro enxergar a série histórica. Precisa trocar ano e reler uma página inteira para comparar períodos.

**Usuário de teclado ou leitor de tela:** o gráfico anual é bem servido por alternativa textual. A remoção da tabela mensal é segura se o gráfico mensal também sair; o novo histórico expansível deve expor `aria-expanded`, contagem de itens ocultos e foco previsível.

## Observações menores

- “Dados da Câmara atualizados até...” e o período de exercício continuam necessários, mas cabem em uma legenda única.
- As descrições de categoria chegam em caixa alta da fonte e dominam a legenda no mobile; a grafia da fonte deve ser preservada no dado, mas a apresentação pode avaliar capitalização visual sem alterar o valor contratual.
- O seletor anual de 10rem é adequado; numa visão histórica agregada, ele pode sobreviver apenas para abrir detalhe de um ano, não como controlador da página inteira.

## Perguntas a considerar

1. A visão padrão deve ter todos os anos em linhas compactas ou apenas os últimos cinco, com “Ver anos anteriores”?
2. Os detalhes de proposições, órgãos e discursos devem continuar disponíveis sob demanda nesta página ou sair completamente?
3. Vale investir já na distinção entre proponente/primeiro signatário e apoiador, ou a primeira versão deve manter apenas “proposições assinadas”?
