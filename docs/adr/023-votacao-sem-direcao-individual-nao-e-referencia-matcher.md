# Votação sem direção de voto individual não serve de referência do matcher

A fonte da Câmara às vezes publica o placar oficial de uma votação sem publicar a direção do voto de cada deputado: `votacoes-{ano}.csv` traz `sim 322, não 18`, e as linhas correspondentes em `votacoesVotos-{ano}.csv` vêm todas em branco. O passo `sanity` já detecta e registra a divergência como `votos_individuais_ausentes`, sem criar registro sintético, porque inventar direção de voto é exatamente o que a ingestão não faz.

A decisão registrada aqui é sobre o que o matcher faz com essas votações. Uma votação em que **nenhum** deputado tem direção de voto deixa de ser candidata a votação de referência. Quando a proposição não tem nenhuma outra candidata, ela sai de `proposicao_computavel` e o matcher deixa de oferecê-la.

O motivo não é a corretude do resultado, que já estava protegida. `voto_nao_informado` faz parte de `FORA_DO_DENOMINADOR` em `apps/api/src/matcher/rules/compatibilidade-metrics.ts`, então todos os deputados dessa votação saem do cálculo e ela não contribui com nada para nenhum score. O problema é de produto: a proposição computável é oferecida ao usuário como uma pergunta, e a função inteira de uma pergunta do matcher é produzir casamento com deputados. Uma pergunta que não pode casar ninguém, sob nenhuma resposta possível, cobra atenção do usuário e devolve nada. É custo puro, e o usuário não tem como saber disso ao respondê-la.

O descarte acontece na derivação de `proposicao_computavel`, não na leitura. Essa tabela é o contrato de "o que o matcher pode perguntar"; deixá-la afirmar que uma proposição é computável e filtrar depois obrigaria cada consumidor a repetir o filtro, e o primeiro que esquecesse reintroduziria a pergunta morta sem nenhum sinal.

A condição é **nenhuma** direção de voto, não poucas. Votação com participação baixa continua legítima: ali os deputados que votaram têm posição real, e os ausentes já são tratados pela classificação existente. O que desqualifica é o conjunto vazio de direções, que é o que distingue a lacuna da fonte de um plenário esvaziado.

A ordem de preferência importa. Descartar a votação como candidata vem antes de descartar a proposição: se outra votação da mesma proposição tem prioridade de referência e tem direção de voto, é ela que passa a ser a referência, e a proposição continua computável. Perder a proposição é a consequência do caso em que não sobra candidata, não o objetivo.

## Alternativas rejeitadas

**Manter a proposição e sinalizar a lacuna na interface.** Preservaria a cobertura do matcher e seria honesto com o usuário. Rejeitada porque não há o que a sinalização possa oferecer: a proposição não tem resposta útil, e explicar isso no meio do fluxo gasta mais atenção do que simplesmente não perguntar. Transparência serve para qualificar um dado que o usuário ainda pode usar, não para justificar um dado inutilizável.

**Filtrar na leitura, mantendo a linha em `proposicao_computavel`.** Evitaria mexer no passo derivado e seria reversível sem reingestão. Rejeitada por espalhar a regra: a tabela passaria a significar "computável, exceto quando não for", e a verdade sobre o que o matcher pergunta deixaria de estar em um lugar só.

**Usar outra votação da mesma proposição mesmo sem prioridade de referência.** Recuperaria a proposição em mais casos. Rejeitada porque a prioridade existe justamente para separar mérito de procedimento; rebaixá-la para não perder uma proposição trocaria uma pergunta inútil por uma pergunta enganosa, em que o usuário acha que se posicionou sobre o mérito e se posicionou sobre um requerimento.

**Tratar como lacuna de dados e deixar o matcher decidir em runtime.** É o que acontece hoje de fato, e não custa nada implementar. Rejeitada porque o efeito observável é a pergunta chegando ao usuário: a neutralização no denominador protege o número, não a experiência.

## Consequências

O conjunto de proposições computáveis encolhe. Na base ingerida em 2026-08-17 o efeito é de uma proposição em 516: a 2312515, cuja única votação (`2312515-18`, de 2021-12-15) tem 348 votos e nenhuma direção. Como essa proposição não tem outra votação, ela é o caso em que o descarte da candidata implica o descarte da proposição.

O `sanity` continua registrando `votos_individuais_ausentes` para as quatro votações afetadas. A lacuna da fonte não deixa de existir por causa desta decisão; o que muda é só o matcher parar de construir pergunta sobre ela. As outras três já não eram referência de nada.

A derivação de `proposicao_computavel` ganha uma dependência de dado que antes não tinha: além da classificação da votação, passa a precisar das contagens por direção. Como o passo é derivado e faz substituição completa, uma reingestão recalcula o conjunto sem migração de dado.

A regra muda o resultado da derivação, então `rule_version` de `proposicao_computavel` precisa ser incrementada. Sem isso, uma base derivada pela regra antiga fica indistinguível de uma derivada pela nova.

Uma proposição pode voltar a ser computável sem que nada no nosso código mude, caso a Câmara publique depois as direções que faltavam. Isso é esperado e não exige tratamento especial: a derivação lê o que está no banco a cada execução.
