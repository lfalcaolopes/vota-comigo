# Filtro de concordância do matcher fica fora do endereço de página

O filtro de concordância do matcher — que restringe o resultado aos deputados com concordância em todas as proposições marcadas pelo usuário — é entrada do rascunho de execução do matcher, guardada em `sessionStorage`, e não aparece na URL. Escopo e apenas em atividade continuam na query string como o ADR 020 decidiu; este terceiro filtro de resultado, não. A assimetria é deliberada.

A razão é que os três filtros não têm a mesma natureza. `escopo=nacional` e `atividade=1` são recortes institucionais e não revelam nada sobre quem os aplicou. A proposição marcada revela: ela indica que o usuário selecionou aquela proposição e, cruzada com os deputados exibidos, entrega a posição declarada. O filtro só existe porque o conjunto exibido é homogêneo naquela votação — se todos os deputados na tela votaram `não`, a posição do usuário era "não deveria ser aprovada". A inferência é imediata e não exige acesso ao rascunho. Colocar o identificador da proposição na URL gravaria convicção política, dado sensível pelo Art. 5º, II da LGPD, no histórico do navegador, em capturas de tela e em qualquer log que registre caminho de página — exatamente o que o ADR 020 evitou ao rejeitar o rascunho serializado na URL, e o que a regra correspondente do `CONTEXT.md` proíbe.

O filtro vale como parâmetro do corpo do `POST /matcher`, não como recorte no cliente. Proibir o endereço não proíbe computar: as posições do usuário inteiras já viajam nesse corpo, e a regra do glossário veda persistir e endereçar, não calcular. A alternativa de filtrar no cliente sobre a página carregada foi descartada por quebrar a paginação do servidor, que produziria páginas de tamanho imprevisível e um `total` que não corresponde ao que o usuário vê.

## Alternativas rejeitadas

**`externalIdProposicao` na query string.** Simétrico com os outros dois filtros de resultado, trivial de implementar, e voltar e avançar funcionariam sem nenhuma peça nova. Rejeitada porque exigiria reescrever a regra do `CONTEXT.md` que proíbe o rascunho de aparecer em endereço de página, aceitando convicção política inferível no histórico do navegador em troca de conveniência de implementação.

**Índice posicional na URL (`?concordancia=2-5`).** Preservaria a simetria sem expor identificador, já que o índice não significa nada para quem não tem o rascunho. Rejeitada por fragilidade silenciosa: voltar ao passo de seleção e trocar as proposições faz o mesmo índice apontar para outra proposição, e o filtro passa a mostrar um recorte errado sem nenhum sinal na tela. A validação disponível — comparar o índice com o tamanho da lista — não detecta esse caso.

**Estado efêmero em memória, como o modo de seleção do comparativo.** Nada vazaria e nenhuma regra mudaria. Rejeitada porque recarregar a página ou voltar do detalhe de resultado zeraria o filtro, reintroduzindo em escala menor a mesma perda de progresso que motivou o ADR 020.

## Consequências

O filtro não é endereçável. Duas abas do mesmo navegador podem exibir recortes diferentes do mesmo resultado, e não há como levar alguém direto a um resultado filtrado — nem por link, nem por captura de URL em suporte.

O `CONTEXT.md` passa a ter uma regra explícita de exceção para este filtro. Sem ela, a leitura isolada do ADR 020 sugere que todo filtro de resultado vai para a query string, e a próxima pessoa a adicionar um filtro repetiria o padrão errado por analogia.

A decisão de zerar o filtro inteiro a cada mudança de seleção ou de posição elimina a necessidade de reconciliar índices ou identificadores órfãos, ao custo de descartar marcações que não tinham relação com a proposição alterada.

Um filtro que não deixa nenhum deputado passar é resultado legítimo e ganha estado próprio na tela, distinto do resultado vazio por escopo. São diagnósticos opostos — "seu estado não tem deputado elegível" e "seu estado tem, mas nenhum votou como você nisso" — e colapsá-los na mesma tela esconderia a informação mais interessante que o filtro produz.
