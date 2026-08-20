# Ordenação de deputados por uso da cota

## Estado

Entregue em 20 de agosto de 2026. A implementação inclui o contrato compartilhado, a regra mensal pura, a materialização `deputado_cota_uso`, a ordenação opcional no feed e no matcher e a explicação pública em `/metodologia#ordenacao-uso-cota`. Os resultados calculáveis exibem o período coberto e os dias em exercício, sem expor o termo técnico “teto-base” na interface.

O banco local recebeu a migration e somente o passo derivado `deputado_cota_uso` foi executado. `deputado_exercicio_intervalo` não foi regenerado. Fernando Mineiro (`externalIdDeputado = 204445`) permanece classificado explicitamente como `intervalo-exercicio-inconsistente` até a correção estrutural do histórico.

## Objetivo

Adicionar **Menor uso da cota** como opção de ordenação:

- na listagem pública de deputados;
- no resultado do matcher.

A ordenação deve permitir comparar titulares e suplentes sem transformar pouco tempo em exercício em aparente economia. Todos os deputados permanecem visíveis; não há duração mínima de exercício para participar do resultado.

A métrica não avalia qualidade, produtividade ou desempenho parlamentar. Ela informa quanto do teto-base da cota foi utilizado durante a última legislatura em que cada deputado esteve em exercício.

## Decisões consolidadas

- A ordenação é uma opção manual e não substitui o padrão atual de nenhuma das duas superfícies.
- Cada deputado usa como janela a última legislatura em que esteve em exercício.
- Deputados de legislaturas diferentes podem ser ordenados e comparados. A interface identifica a legislatura de cada resultado e avisa quando as janelas divergem no comparativo.
- Não há corte por percentual da legislatura em exercício. Um deputado com período curto continua visível e pode receber a métrica.
- A normalização usa o teto-base acumulado nos meses com direito à cota, não gasto por dia.
- Os dias em exercício contextualizam o resultado no card, no perfil e no comparativo, mas não entram na fórmula.
- Resultados sem cálculo disponível aparecem depois dos calculáveis, sem serem removidos.
- A explicação completa fica na página de metodologia. Controles e cards usam apenas o texto necessário para entender a ordenação.

## Nome público

O rótulo da opção é:

> Menor uso da cota

A descrição curta no painel de filtros é:

> Percentual da cota usado no período analisado.

Não usar **menores gastos**, pois a ordenação não usa o valor absoluto. Não usar **economia da cota**, pois um percentual menor não demonstra, sozinho, melhor uso do recurso.

## Métrica

Para um deputado `d`:

```text
percentual de uso do teto-base(d) =
  100 × gasto na janela(d) / teto-base na janela(d)
```

Quando a janela abrange mais de um ano, somam-se os valores antes da divisão:

```text
percentual = 100 × soma(gastos) / soma(tetos-base)
```

Não calcular a média simples dos percentuais anuais. Um período de um mês não pode receber o mesmo peso de um ano inteiro.

Também não dividir gasto e teto por dias. Se ambos fossem divididos pelos mesmos dias, eles se cancelariam; além disso, a cota é mensal, não diária.

### Numerador

O gasto na janela inclui todos os débitos e ajustes cuja competência financeira, identificada pelos campos originais `numAno` e `numMes`, esteja dentro da legislatura considerada e até o último mês coberto pela fonte.

O valor utilizado preserva a regra vigente do produto:

```text
vlrLiquido - vlrRestituicao
```

Nos períodos em que a passagem aérea SIGEPA precisa de reposição, o valor reposto só pode entrar quando o ano satisfizer a regra de completude já adotada pelo produto.

`numMes` e `numAno` não representam a emissão do comprovante nem a data de processamento do reembolso. A Câmara define esses campos como a competência financeira que determina quando a despesa produz efeito sobre a CEAP. Por isso:

- não recortar por `datEmissao`;
- não recortar por `datPagamentoRestituicao`;
- não deslocar uma despesa para o mês em que o recibo foi apresentado;
- preservar restituições e cancelamentos na competência publicada pela Câmara.

Uma competência dentro da legislatura entra no numerador mesmo que o deputado não tenha um intervalo de exercício naquele mês. Isso preserva ajustes lançados depois de afastamentos e evita aumentar artificialmente o percentual ao descartar valores negativos. A ausência de exercício no mês não cria teto adicional no denominador.

Fontes oficiais:

- [Cota Parlamentar: o significado de cada campo](https://dadosabertos.camara.leg.br/howtouse/2023-12-26-dados-ceap.html)
- [Gastos parlamentares](https://www.camara.leg.br/transparencia/gastos-parlamentares/)

### Denominador

O teto-base na janela é a soma dos limites mensais correspondentes:

- à UF do deputado no respectivo período;
- às vigências da tabela de teto em cada mês;
- aos meses da legislatura tocados por ao menos um intervalo de exercício;
- somente até o último mês coberto usado pelo numerador.

Um mês tocado por mais de um intervalo conta uma vez. Um mês tocado por um intervalo conta o teto mensal inteiro; não há pró-rata diário.

Se a fonte registrar UFs diferentes dentro da mesma janela, o teto deve usar a UF correspondente a cada período, sem aplicar a UF mais recente retroativamente. Uma inconsistência que não permita resolver a UF torna a métrica indisponível.

O denominador é chamado **teto-base** porque a tabela disponível não inclui todos os adicionais vinculados a cargos e funções institucionais. Consequentemente, um percentual acima de 100% pode ser legítimo e não representa irregularidade.

## Janela individual

### Escolha da legislatura

A janela de cada deputado é a última legislatura em que ele teve intervalo de exercício. A regra acompanha a janela individual já adotada pelo comparativo de dados gerais.

Exemplos:

- quem atuou na 57ª legislatura usa a 57ª;
- quem atuou pela última vez na 56ª usa a 56ª;
- dois deputados podem aparecer na mesma lista com legislaturas diferentes;
- entradas, afastamentos e reassunções dentro da legislatura alteram os meses com teto, mas não mudam a legislatura escolhida.

Não forçar uma interseção temporal entre deputados. Isso descartaria informação disponível e produziria janelas arbitrárias.

### Limites da janela

O numerador considera competências entre o primeiro e o último mês da legislatura. O denominador considera, dentro desses limites, apenas os meses tocados pelos intervalos de exercício.

Para a legislatura em curso, ambos terminam no mesmo último mês utilizável da cobertura da cota. O mês que ainda não estiver coberto não entra no gasto nem no teto.

Deputados cuja última legislatura seja anterior à cobertura da CEAP adotada pelo produto permanecem visíveis, mas recebem métrica indisponível.

## Disponibilidade do cálculo

### Calculável

O percentual é calculável quando:

- existe uma última legislatura coberta;
- existe ao menos um mês com direito ao teto-base;
- a UF e a tabela de teto são conhecidas para todos os meses necessários;
- a fonte de gastos está completa no período incluído;
- a reposição SIGEPA está completa quando aplicável.

Um período coberto sem gasto é zero real e produz `0%`, desde que o direito à cota e a cobertura possam ser demonstrados.

### Indisponível

O cálculo fica indisponível quando faltar qualquer informação necessária ao numerador ou ao denominador. Exemplos:

- última legislatura anterior à cobertura do produto;
- nenhum intervalo de exercício confiável;
- UF ausente ou inconsistente;
- tabela do teto-base ausente;
- fonte incompleta;
- reposição SIGEPA incompleta.

O deputado não é excluído. Na ordenação por uso da cota, resultados indisponíveis ficam depois dos calculáveis.

O card usa:

> Uso da cota indisponível

Não exibir gasto parcial como se fosse zero e não usar ausência de dados como vantagem na ordenação.

## Valores incomuns

### Acima de 100%

Preservar o percentual. A metodologia explica que o teto-base não inclui todos os adicionais institucionais. A interface não usa linguagem de excesso, estouro ou irregularidade.

### Negativo

Preservar o percentual negativo. Cancelamentos de passagens e restituições podem superar os débitos da janela. A metodologia explica a causa; a apresentação nunca converte o sinal para positivo.

### Teto zero ou desconhecido

Não dividir. A métrica fica indisponível.

### Empate

Na listagem de deputados, desempatar por nome público e depois por `externalIdDeputado`.

No matcher, deputados calculáveis são ordenados primeiro pelo percentual crescente. Empates preservam uma ordem determinística por nome público e `externalIdDeputado`. Entre resultados indisponíveis, preservar a ordenação normal do matcher para que a ausência da métrica não apague o sinal de compatibilidade.

## Comportamento das superfícies

### Listagem de deputados

- A ordenação padrão por nome permanece.
- **Menor uso da cota** entra como opção no painel de filtros, em uma seção de ordenação.
- O valor escolhido faz parte do endereço da página.
- A API ordena antes da paginação.
- Quando a opção estiver ativa, cada linha acrescenta:

> Uso da cota: 72%
>
> Período analisado: fev/2023 – ago/2026 · 1.184 dias em exercício

- Quando a métrica estiver indisponível, usa **Uso da cota indisponível**.
- Quando a opção não estiver ativa, a linha não recebe informação de cota.

Acima da lista, quando a ordenação estiver ativa, exibir uma única explicação:

> Ordenado pelo menor uso da cota no período analisado. Entenda o cálculo.

**Entenda o cálculo** aponta para a definição correspondente na metodologia.

### Resultado do matcher

- A ordenação padrão por compatibilidade permanece.
- **Menor uso da cota** entra como opção manual no painel de filtros.
- A ordenação faz parte do recorte público persistido no endereço, sem incluir as posições políticas do usuário.
- O cálculo de compatibilidade continua sendo executado e exibido normalmente.
- Quando a nova ordenação estiver ativa, o card preserva a concordância como valor principal e acrescenta:

> Uso da cota: 72%
>
> Período analisado: fev/2023 – ago/2026 · 1.184 dias em exercício

- Quando a opção não estiver ativa, o card não recebe informação de cota.
- O contexto único acima da lista e o link para a metodologia seguem a mesma forma da listagem de deputados.

Uma lista ordenada por cota não pode exibir apenas a concordância, pois a sequência pareceria incorreta. A linha compacta da cota é o vínculo visível entre a opção escolhida e a posição do card.

### Perfil e comparativo

Este incremento não precisa acrescentar quatro linhas aos cards nem duplicar toda a metodologia nas superfícies de resultado.

O perfil e o comparativo continuam sendo os lugares para valores absolutos, limite em reais, meses considerados, categorias e detalhamento anual. Quando a métrica compacta apontar para o perfil, o usuário pode auditar o resultado com esses dados.

## Metodologia pública

Adicionar uma definição endereçável em:

```text
/metodologia#ordenacao-uso-cota
```

A definição deve explicar:

- a fórmula;
- o uso da última legislatura individual;
- a possibilidade de comparar legislaturas diferentes;
- a competência financeira de `numAno` e `numMes`;
- a diferença entre competência, emissão do comprovante e restituição;
- os meses com direito ao teto-base;
- a ausência de pró-rata diário;
- a cobertura da legislatura em curso;
- a reposição SIGEPA;
- os adicionais institucionais ausentes do teto-base;
- percentuais acima de 100% e negativos;
- por que a métrica não avalia desempenho parlamentar.

O painel atual **Gastos da cota parlamentar** precisa distinguir a comparação anual com a mediana da UF desta nova ordenação por percentual do teto-base. A regra vigente que omite a mediana para exercício anual parcial não impede o novo cálculo, pois são métricas diferentes.

## Contrato compartilhado

Tipos que atravessem front e API devem ser definidos uma vez em `@vota-comigo/shared-types` como schemas Zod e inferidos a partir deles.

A implementação deve ter um conjunto compartilhado de ordenações que permita derivar os subconjuntos aceitos por cada superfície:

- listagem: nome e menor uso da cota;
- matcher: compatibilidade e menor uso da cota.

Não declarar unions paralelas no frontend e no backend.

O resumo público da métrica deve ser uma união discriminada com, no mínimo:

- resultado calculável: percentual, legislatura, início do período, cobertura e dias em exercício;
- resultado indisponível: motivo estruturado.

O motivo estruturado serve à API, aos testes e à apresentação. A interface pode consolidar os motivos no texto curto **Uso da cota indisponível**, deixando a explicação específica para uma superfície detalhada quando houver valor para o usuário.

## Persistência e cálculo

O cálculo precisa estar materializado antes das consultas públicas. A listagem ordena e pagina no banco, e recalcular vários anos de JSON para cada request seria incompatível com esse caminho.

A tabela `deputado_cota_comparacao` já tem uma linha por deputado, a última legislatura, gasto, teto e data de referência. Ela pode ser reaproveitada ou refatorada, mas a nova métrica não pode depender de `percentualSobreMedianaUf` nem do status da mediana:

- uso do teto-base e comparação com a mediana são cálculos independentes;
- um ano sem mediana ainda pode ter gasto e teto-base calculáveis;
- o numerador atual do comparativo agrega no grão anual e precisa ser revisto para respeitar os limites mensais exatos da legislatura;
- o teto deve usar a UF correspondente a cada período, não uma única UF recente aplicada à janela inteira.

Se a separação de estados e invariantes tornar a tabela atual ambígua, preferir uma materialização própria para o uso da cota em vez de sobrecarregar o status de comparação com a mediana.

No matcher, carregar a materialização em lote para os deputados avaliados e anexar o resumo antes da ordenação. Não consultar a cota deputado por deputado.

## Pré-requisito de integridade do exercício

A ordenação depende diretamente dos intervalos de exercício. Antes da implementação, investigar o caso de `externalIdDeputado = 204445`, Fernando Mineiro.

Na base local analisada em 20 de agosto de 2026:

- há gastos contínuos entre 2023 e 2026;
- o último intervalo derivado termina em 1º de fevereiro de 2023;
- 43 competências e cerca de R$ 1,78 milhão ficam classificadas como fora de exercício por causa dessa divergência.

O caso domina a varredura de competências fora de exercício e indica falha no histórico ou na derivação, não uma regra temporal da CEAP. Ele precisa ser corrigido ou classificado explicitamente antes de confiar no denominador da nova ordenação.

Depois de retirar esse caso da medição, as competências fora dos meses de exercício têm saldo líquido aproximado de `-R$ 23,7 mil`, coerente com a presença de restituições e cancelamentos posteriores. Esse resultado sustenta a decisão de manter no numerador todas as competências dentro da legislatura, mesmo quando o mês não tem intervalo de exercício.

## Casos de teste

Os testes devem descrever comportamento e ser agrupados por cenário.

### Cálculo

- titular em exercício durante toda a legislatura;
- suplente com um único mês de exercício;
- suplente com entradas e saídas intermitentes;
- dois intervalos tocando o mesmo mês sem duplicar o teto;
- despesa positiva em mês sem exercício, dentro da legislatura;
- restituição negativa em mês sem exercício, dentro da legislatura;
- competência fora dos limites da legislatura;
- legislatura em curso com cobertura parcial;
- mudança de teto durante a janela;
- UFs diferentes em períodos resolvíveis;
- ausência ou inconsistência de UF;
- gasto zero real;
- gasto negativo;
- percentual acima de 100%;
- teto ausente ou zero;
- SIGEPA completo e incompleto.

### Ordenação

- percentuais crescentes antes dos indisponíveis;
- zero e valores negativos preservados;
- empate determinístico;
- indisponíveis preservando o ranking normal do matcher;
- ordenação aplicada antes da paginação;
- padrão atual inalterado nas duas superfícies.

### Interface

- resumo compacto exibido somente com a ordenação ativa;
- concordância continua principal no card do matcher;
- legislatura aparece ao lado do percentual;
- estado indisponível não parece gasto zero;
- contexto único acima da lista aponta para a metodologia;
- endereço preserva a ordenação;
- texto permanece legível no card mobile e para leitor de tela.

## Fora de escopo

- transformar menor uso da cota em ordenação padrão;
- esconder deputados por duração mínima de exercício;
- filtrar por faixas de uso da cota;
- ordenar por valor absoluto;
- criar gasto por dia;
- criar gasto por votação, presença ou proposição;
- combinar gasto e atividade parlamentar em uma nota única;
- ordenar por categorias específicas da cota;
- interpretar percentual menor como melhor desempenho;
- acusar irregularidade com base em percentual acima de 100%.

## Sequência sugerida

1. Corrigir ou classificar a inconsistência do intervalo de Fernando Mineiro.
2. Escrever testes focados para a janela mensal, competência financeira e teto-base.
3. Extrair o cálculo puro da métrica e estabilizar seus estados.
4. Materializar o resultado por deputado e última legislatura.
5. Definir o contrato compartilhado de ordenação e resumo da métrica.
6. Integrar a ordenação na listagem de deputados.
7. Integrar a ordenação no matcher sem alterar seu padrão.
8. Adicionar o resumo condicional aos dois tipos de card.
9. Publicar a definição na metodologia e ligar as superfícies à âncora.
10. Validar valores extremos, paginação, URLs e apresentação mobile.

## Critérios de aceite

- Titulares e suplentes usam a mesma razão entre gasto e teto-base acumulados.
- Nenhum deputado é removido por ter exercido uma fração pequena da legislatura.
- A última legislatura é derivada individualmente.
- Gasto e teto terminam no mesmo último mês coberto.
- Competências seguem `numAno` e `numMes`, sem usar datas de emissão ou pagamento como substitutas.
- Ajustes dentro da legislatura não são descartados por ausência de exercício no mês.
- A ordenação crescente acontece antes da paginação.
- Resultados indisponíveis continuam visíveis depois dos calculáveis.
- Os padrões atuais da listagem e do matcher permanecem inalterados.
- O card acrescenta no máximo uma linha curta quando a ordenação está ativa.
- A metodologia explica a fórmula e suas limitações em uma seção endereçável.
- O contrato compartilhado é a única fonte dos conjuntos literais e formatos que atravessam front e API.
