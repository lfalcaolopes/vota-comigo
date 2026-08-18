# Revisão dos resumos de IA

Como revisar os resumos gerados por IA em `apps/api/data/generated/proposicao-resumos/{ano}.json` e promovê-los de `pending` para `approved`.

O trabalho é: ler cada resumo pendente, decidir se ele é **fiel** ao inteiro teor da proposição e se **cumpre o prompt de geração**, corrigir o que estiver errado e marcar como revisado. Fidelidade é o critério que importa mais; formatação é a parte fácil.

## A autoridade é o prompt, lido literalmente

`apps/api/src/ingestion/proposicao-resumo-ia/generation/proposicao-resumo-ia-prompt.ts` é a especificação. Nada nesta doc substitui o texto dele. Antes de tratar qualquer coisa como defeito, **abra o arquivo e leia a linha da regra**.

Isso não é formalidade. Numa revisão anterior um linter marcava qualquer `Maiúscula...:` como "rótulo com dois-pontos", e o agente reescreveu dezenas de bullets corretos antes de notar que a regra proíbe **substantivo**-rótulo — bullet que começa com verbo e usa dois-pontos para abrir uma lista está certo. Foram 43 defeitos inexistentes reportados. A regra parafraseada de memória é onde o erro entra.

### O que o prompt v3 exige

Linguagem — escrever para quem não acompanha política; traduzir juridiquês; **nunca usar termo técnico sem uma explicação curta ao lado**; frases curtas.

Conteúdo — basear-se **somente** no texto fornecido, sem inventar efeitos, números, beneficiários ou apelidos; descrever o que a proposição estabelece em **termos absolutos**, não o que ela muda em relação à lei vigente, salvo se o próprio texto declarar a alteração; **nada de artigo, inciso, parágrafo, ADCT ou referência cruzada**, em nenhum campo.

`resumoCard` — **uma frase** com o efeito central, legível de relance numa listagem.

`resumoDetalhe` — de **2 a 4 bullets**, cada um numa linha começando por `"- "`, cada um abrindo com **verbo no presente**; **proibido qualquer número**, sem exceção; panorama dos grandes blocos, não lista de dispositivos; sem listas exaustivas de categorias; sem afirmar efeito líquido em relação à regra atual.

### O que o prompt NÃO exige

Convenções do corpus que valem como padronização, mas **não** são violação do prompt — não reporte como defeito de geração:

- Bullet começando em maiúscula e terminando em ponto final. É consistência, não regra.
- Limite de caracteres do card. A regra é "uma frase, legível de relance". Um teto de ~260 caracteres funciona como heurística para achar cards que viraram parágrafo; o defeito real é a segunda frase, não o número.
- **Número no `resumoCard`.** A proibição de números vale só para o `resumoDetalhe`. Quando o número é o efeito central — o piso salarial, a jornada semanal, a data comemorativa, o percentual de redução — ele **fica** no card, e em dígito. No detalhe, a mesma informação vai por extenso ou some.

## Fluxo por item

Três níveis, do mais barato ao mais caro. Suba de nível quando o anterior não resolver.

**1. Checagem mecânica.** Um script de regex sobre o JSON acha o que é mecanicamente verificável: contagem de bullets, prefixo `- `, dígitos no detalhe, referências a dispositivo, glosa auto-repetida, hífen não-separável, capitalização, pontuação. Escreva o seu, derivando cada regra da linha correspondente do prompt. Não confie num linter herdado sem reconferir as regras.

**2. Ementa e keywords da API.** `https://dadosabertos.camara.leg.br/api/v2/proposicoes/{id}` devolve `ementa`, `ementaDetalhada`, `keywords` e `urlInteiroTeor`. Serve para conferir rapidamente se o resumo está falando da proposição certa e se um verbo comparativo ("Reduz", "Amplia") é legítimo — se a ementa declara a alteração, é.

**3. Inteiro teor.** Baixe o PDF de `urlInteiroTeor` e leia com `pdftotext -layout`. É o único jeito de verificar fidelidade. **Todo achado que valeu alguma coisa veio daqui**, nunca do linter.

### Por que o passo 3 é indispensável

Exemplos reais de resumos que passavam limpos em qualquer checagem mecânica e estavam errados:

- **PL 4278/2025 (TRF5)** — o bullet afirmava que a proposição "prevê a especialização das turmas", autoriza órgão especial e "estabelece prazo". Os artigos só criam três cargos de desembargador. Especialização, órgão especial e o prazo de 60 dias existem apenas na exposição de motivos.
- **PL 2/2024 (depreciação acelerada)** — o bullet dizia que o Executivo pode ampliar por decreto "as atividades contempladas", fundindo dois dispositivos: um autoriza ampliar **o valor** da renúncia, outro atribui ao Executivo **definir** as atividades, sem falar em ampliação.
- **PDL 3/2025 (susta resolução do Conanda)** — dois dos três bullets vinham da justificação, escritos no indicativo e com sujeito ambíguo ("Afirma que a resolução dava autonomia decisória a menores..."), lidos como descrição do que a resolução faz.

### Justificação não é dispositivo

O inteiro teor traz a justificação, a exposição de motivos e às vezes pareceres. **Nada disso é o que a proposição faz.** Quando o conteúdo vier de lá, o bullet tem que dizer isso: `Apresenta justificativa...`, `Sustenta, na justificativa, que...`, `Invoca como fundamento...` — e, em matéria controversa, verbo no condicional (`daria`, `permitiria`), porque é alegação do autor, não fato.

Em proposição de puro rito — decreto legislativo que aprova tratado, projeto que renomeia um espaço — o normativo tem um artigo só, e a justificação é a única fonte de um segundo bullet. Aí ela é legítima, com a atribuição explícita.

## O que corrigir sozinho e o que levar para o humano

**Direto, sem perguntar:**

- Cláusula de vigência ("entra em vigor na data de sua publicação"), seja bullet inteiro ou rabicho no fim de outro. Cuidado: `"antes da lei entrar em vigor"` e `"enquanto a lei complementar não entrar em vigor"` são substantivos, não boilerplate.
- Capitalização, pontuação final, gramática, hífen não-separável (U+2011).
- Glosa malformada — `IPCA (IPCA, índice de inflação)`, `REIQ — REIQ é um benefício` — e glosa de termo que o bullet nem usa.
- Sigla sem tradução na primeira aparição, e sigla no card cuja explicação só existe no detalhe. O card tem que se sustentar sozinho.
- Auto-referência vazia: "conforme previsão do texto", "as regras previstas na própria lei", "o parágrafo proposto", "conforme o anexo do projeto". Cuidado: `"anexo da lei orçamentária anual"` é documento externo real.
- Correção de fidelidade que você **verificou** contra o inteiro teor.

**Com aval do humano:**

- Usar fonte externa ao PDF para preencher lacuna de conteúdo (ementa e keywords da proposição). O prompt manda basear-se somente no texto fornecido; puxar da ementa é sair dele. Costuma ser aprovado, mas avise.
- Qualquer mudança que altere o sentido do que a proposição faz.
- Resolver ambiguidade ou contradição do texto-fonte. Acontece: o PL 4357/2023 proíbe desapropriar "a propriedade produtiva **que não cumprir sua função social de terras produtivas**", oração que contradiz o resto e o dispositivo constitucional invocado. Qualquer resumo legível escolhe uma leitura. Essa escolha é do humano.

## Falsos positivos conhecidos

Não são defeitos, apesar de parecerem:

| Aparência | Por quê |
| --- | --- |
| Verbo comparativo (`Reduz`, `Amplia`, `Altera`) | Legítimo quando a própria ementa declara a alteração |
| Dígito no card | Permitido quando o número é o efeito central |
| Dígito em nome próprio (`Rota 2030`, `5ª Região`) | Faz parte do nome |
| `"atualmente chamado"` | Obrigatório em proposição que renomeia algo |
| Dois-pontos depois de verbo no presente | A regra proíbe substantivo-rótulo |
| `"anexo da lei orçamentária anual"` | Documento externo, não auto-referência |
| `"antes da lei entrar em vigor"` | Conteúdo, não cláusula de vigência |

## Mecânica da edição

Formato do arquivo — `{ "ano": <int>, "items": { "<idProposicao>": { ... } } }`. Campos do item em `apps/api/src/ingestion/proposicao-resumo-ia/schemas/proposicao-resumo-ia-json.schema.ts`; os enums de `generationStatus` e `reviewStatus` vivem em `packages/shared-types/src/proposicoes.ts` e são a fonte da verdade.

Aprovar é `reviewStatus: "approved"` mais `reviewedAt` em ISO 8601 com `Z`. Use o mesmo timestamp para o lote inteiro — facilita auditar depois qual rodada mexeu em quê.

**Itens com `generationStatus` diferente de `generated` ficam em `pending`.** `insufficient_source` e `source_too_large` não têm resumo para revisar; `resumoCard` e `resumoDetalhe` são `null`. É a convenção já commitada no corpus.

Ao reescrever o arquivo em Python, use `json.dumps(d, ensure_ascii=False, indent=2)` e preserve a quebra de linha final como estava. O gerador escreve **sem** quebra final; normalizar cria diff espúrio a cada regeração. Se isso incomodar, o lugar de arrumar é o writer, não os dados.

### Guardas obrigatórias em edição por script

Toda edição em lote roda com verificação, não com fé:

- Casamento **exato** da string antiga antes de substituir — `assert old in campo`, nunca regex frouxa.
- Conjunto de IDs idêntico antes e depois.
- Nenhum item fora do alvo alterado, comparando contra um snapshot tirado no início do script.
- Contagem de bullets dentro de 2 a 4 depois de remover qualquer um. Remover a vigência às vezes deixa **um** bullet — aí é preciso dividir o que sobrou ou achar um segundo bloco legítimo, não deixar quebrado.

Depois de aplicar, confira contra o `HEAD` (`git show HEAD:<path>`) que os IDs batem e que os status mudaram só onde deveriam.

## Operação

O endpoint de inteiro teor da Câmara (`prop_mostrarintegra`) **cai com 503 de forma intermitente**. Não conclua que o documento não existe: um arquivo de 190 bytes é a página de erro do nginx, não um PDF. Faça laço de retentativa com espera; costuma voltar em minutos. A API de `proposicoes` é bem mais estável e raramente falha junto.

## Ritmo

O corpus tem centenas de itens. Trabalhe por ano, do mais antigo para o mais novo, em lotes que caibam numa leitura atenta — um ano cheio de cada vez quando o volume é grande. Aplique o mecânico em lote e leve para o humano só o que exige julgamento, agrupado. Parar a cada vírgula trava a revisão; aplicar tudo sozinho perde o que só o humano decide.

Ao relatar, separe o que você verificou contra o inteiro teor do que é heurística sua. E se descobrir que uma classe inteira de "defeito" era invenção do seu linter, diga isso antes de qualquer outra coisa.
