# Fluxo do matcher no front usa rota por passo e rascunho de sessão

Cada passo do matcher e cada view derivada dele passam a ter endereço próprio, e o rascunho de execução do matcher passa a viver em `sessionStorage`. Este ADR supera o ADR 017, que decidia o oposto — wizard client-side em rota única `/matcher`, sem URL e sem storage.

A decisão vem de teste com usuários reais, não de preferência arquitetural. Com o fluxo inteiro ocupando uma única entrada de histórico, o primeiro clique no botão voltar do navegador levava o usuário para fora do produto e descartava tudo que ele havia respondido — inclusive quando ele já tinha declarado posição sobre dezenas de proposições. O ADR 017 previu esse comportamento e o classificou como aceitável no MVP-2; o teste mostrou que não é.

O mapa de endereços é:

```
/matcher                              redireciona ao passo mais avançado que o rascunho sustenta
/matcher/local
/matcher/proposicoes
/matcher/posicoes/[index]             replace entre proposições
/matcher/posicoes/revisao             push
/matcher/resultado?escopo=&atividade= replace na troca de filtro
/matcher/resultado/[externalIdDeputado]  push
/matcher/comparativo/[ids]            push
```

A escolha entre `push` e `replace` não é estilística: ela define o que o botão voltar significa em cada tela. Onde existe um botão de voltar ou cancelar visível, o histórico é empilhado para que os dois gestos coincidam — detalhe do deputado, comparativo e revisão. Onde empilhar criaria uma armadilha de histórico, a entrada é substituída: como a seleção admite até trinta proposições, dar `push` a cada resposta obrigaria o usuário a clicar trinta vezes em voltar para sair do matcher, punindo exatamente o gesto que motivou este ADR. O mesmo vale para os filtros do resultado. O modo de seleção do comparativo continua efêmero e é cancelado apenas pelo botão, por ser modo sobre uma tela e não uma tela.

O rascunho contém apenas entradas do usuário — `siglaUf`, `cidade`, `escopo`, cards das proposições selecionadas e posições. Resultado, detalhe e comparativo são derivados e sempre recalculados, aplicando ao front o mesmo princípio que o ADR 004 aplica ao banco: persistir o componente auditável, nunca o derivado. Guardar os cards inteiros em vez de apenas os ids evita trinta requisições na reidratação ou um endpoint de busca em lote que não existe; como o rascunho morre junto com a aba, uma ementa desatualizada por algumas horas é irrelevante. A leitura é validada com os schemas de `shared-types` e um rascunho que não valida é descartado em silêncio, para que mudança de contrato não deixe usuários presos num estado que quebra a página.

## Alternativas rejeitadas

**Rascunho serializado na URL.** Resolveria histórico, refresh e link compartilhável de uma vez, e entregaria o MVP-6 de graça. Rejeitada por privacidade: posição política declarada é convicção política, dado sensível pelo Art. 5º, II da LGPD, e a URL vaza para histórico do navegador, cabeçalho `Referer`, logs de CDN e logs de servidor. Isso contraria o objetivo do ADR 006 de manter os dados fora do regime de dado pessoal por anonimização robusta.

**`localStorage` em vez de `sessionStorage`.** Cobriria também o usuário que fecha a aba por acidente. Rejeitada por confidencialidade em dispositivo compartilhado — lan house, computador de família, máquina de biblioteca —, onde as posições políticas de alguém ficariam legíveis para o próximo usuário por tempo indeterminado e sem nenhum sinal na tela. Nenhuma das duas opções é violação de LGPD: nada trafega para o servidor, o controlador não tem meio de acessar o conteúdo, e a LGPD não tem dispositivo equivalente ao Art. 5º(3) da Diretiva ePrivacy europeia, de onde vem a regra de consentimento para gravar em equipamento terminal. A rejeição é de produto, não jurídica. O ADR 006 já recomenda validação por especialista em LGPD antes do lançamento, e esta decisão deve entrar nessa revisão.

**Query param único de passo (`/matcher?passo=posicoes`).** Diff bem menor, sem mover arquivos de rota nem introduzir provider. Rejeitada por dois motivos. A página seria uma só, então todo passo continuaria pagando o fetch de feed e temas que só o passo de seleção usa. E as sub-views cairiam num namespace plano onde o produto cartesiano é sintaticamente válido (`?passo=local&deputados=1,2,3`), exigindo uma tabela de validação que cresce a cada view nova; com sub-rotas, essas combinações são irrepresentáveis.

**Trocar o wizard por fluxo contínuo em página única.** Considerada e descartada como solução para este problema: uma página contínua em `/matcher` com estado em memória perde tudo no botão voltar e no refresh exatamente como o wizard. O sintoma é do modelo de estado, não do formato visual. Redesenhar a apresentação continua possível depois, sobre esta base.

## Consequências

Nenhum guard de rota pode rodar no servidor, porque `sessionStorage` é inacessível ao SSR. Toda checagem acontece após a hidratação, o que obriga um gate no `layout.tsx` que renderiza estado neutro de retomada até o rascunho ser lido — sem ele, há flash de conteúdo errado.

As URLs parecem compartilháveis e não são: quem abrir um endereço recebido de outra pessoa não tem rascunho e será redirecionado em silêncio ao passo possível. Compartilhamento de verdade continua sendo escopo do MVP-6 e continua exigindo estado serializável no servidor — que este ADR deliberadamente não introduz.

Todo refresh em `/matcher/resultado`, `/matcher/resultado/[id]` ou `/matcher/comparativo/[ids]` dispara POST novo, então a carga na API passa a crescer com a frequência de recarga dos usuários, não só com o número de execuções.

A paginação do resultado não é endereçada: após refresh, o usuário volta à primeira página. Reconstruir N páginas custaria N requisições para um ganho pequeno.

O comparativo passa a ter URL própria e a sobreviver a refresh, contrariando `docs/mvp.md`, que registrava ambos como dispensáveis no MVP-4.
