# Linguagem da interface

Guia de escrita para o texto que o usuário lê. O público é o cidadão que não
acompanha o processo legislativo: ele não sabe o que é proposição, não distingue
votação nominal de simbólica e não tem paciência para decodificar rótulo.

Este guia trata de **rótulo**, não de identificador. Naming de código, rota,
contrato e documentação segue a ADR 007, que continua sendo a autoridade.

## Princípios

**Rótulo de interface ≠ identificador de domínio.** O código diz `proposicao`,
a tela diz "proposta". A divergência é deliberada e vale só na camada de texto:
rótulo, título, contador, estado vazio e mensagem de erro.

**Acessível não é impreciso.** Quando o termo técnico é o nome real da coisa e o
usuário vai reencontrá-lo no portal da Câmara ou no noticiário, o app ensina o
termo em vez de escondê-lo. "Voto nominal" some da home e permanece na
metodologia, glosado.

**Verificar o dado antes de reescrever a frase.** Duas correções desta revisão
não eram de estilo: um título dizia "recentes" enquanto a consulta ordenava por
mais votadas, e a cobertura da base estava cravada em string. Texto que afirma
um fato precisa ser conferido contra o código que produz o fato.

**Mostrar em vez de anunciar.** Afirmar a própria neutralidade produz
desconfiança; descrever o que não se faz produz confiança. Vale para
transparência, isenção e simplicidade — inclusive para não escrever que o texto
está "em linguagem comum".

**Limite não é defeito.** O recorte do produto se descreve como fronteira ("até
onde ela vai", "o que fica de fora"), nunca como falha. A conta não erra, ela é
limitada em escopo.

**Ressalva no ponto de uso.** Disclaimer aparece onde a dúvida nasce — junto do
resultado —, não na primeira dobra, antes de o usuário entender o produto.

**Uma ideia por frase, na ordem em que a coisa acontece.** Sem particípio
pendurado no fim, sem enumeração que mistura formatos gramaticais, sem abrir
pelo que a frase não é ("Além do...").

**Vocabulário estável.** O mesmo conceito usa sempre as mesmas palavras
("entraram na conta", "o que fica de fora", "resumo curto"). Repetição
proposital é consistência; a evitar é a terceira ocorrência da mesma afirmação
na mesma página.

## Vocabulário decidido

| Na tela | Não usar | Onde o termo técnico permanece |
| --- | --- | --- |
| proposta | proposição, projeto, matéria | rota, código, contrato, ADRs, metodologia |
| votação | voto nominal | metodologia (com glosa), textos de escopo |
| conta, cálculo | método, metodologia (em rótulo) | página `/metodologia` |
| resumo curto | resumo em linguagem comum | — |
| o que fica de fora | limites, ressalvas | link "Entender os limites" |
| o Quem Vota Comigo, nós | o produto, a plataforma | — |
| dados oficiais, dados abertos da Câmara | fonte oficial (fora de rótulo) | selo "Fonte oficial" |

## Antes de aprovar um texto

- O rótulo descreve o que o código realmente faz?
- Alguma palavra exige que o usuário saiba o vocabulário do Congresso?
- A frase afirma uma virtude que poderia ser demonstrada?
- O texto repete o que o título ao lado já disse, em vez de complementá-lo?
- Os itens de uma enumeração têm a mesma forma gramatical?
- A data, o número ou o recorte citados vêm do dado ou estão cravados?
