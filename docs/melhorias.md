# Quem Vota Comigo — Melhorias Pós-MVP

## Objetivo

Documento de trabalho das melhorias que entram depois do lançamento do MVP. Organizado em tiers por prioridade, com racional para cada um. Este documento evolui conforme o produto em produção revelar o que importa mais.

## Princípios de priorização

- **Missão primeiro.** A missão da aplicação é ajudar o usuário a decidir em quem votar. Features que servem essa missão têm prioridade sobre features de acompanhamento.
- **Profundidade antes de amplitude.** Melhor ter profundidade na Câmara Federal do que superficialidade em múltiplas casas.
- **Dados existentes antes de dados novos.** Features que aproveitam o que já foi ingerido são mais baratas e menos arriscadas do que features que exigem novas integrações.
- **Justiça metodológica.** Rankings ou classificações que podem gerar interpretação injusta precisam de contextualização adequada ou ficam fora.

---

## Tier 1 — Base e clareza

Melhorias que consolidam o produto, aproveitam dados já ingeridos, e completam lacunas óbvias do MVP.

### Categorização por comissão temática

Usar os dados nativos de áreas temáticas da Câmara (arquivo `proposicoesTemas-{ano}`), já validados no Protótipo quanto à cobertura. Cada proposição pode ter múltiplas áreas temáticas associadas.

**Impactos na UI:**
- Filtros por tema no Feed de Eventos Importantes
- Filtros por tema no seletor de eventos do matcher
- Exibição dos temas no perfil do evento

**Decisão firmada:** não usar IA para categorização. Os dados oficiais da Câmara são mais confiáveis e auditáveis do que classificação editorial via IA.

### Resumo por IA

Tradução do texto da proposição para linguagem acessível, rodada uma vez por proposição em comando separado da ingestão. Frontend apenas lê o resultado pré-processado.

Decisão arquitetural: [ADR 018 — Resumos por IA de proposições são curados em JSON e projetados no banco](./adr/018-resumos-ia-proposicoes-json-projetados-banco.md).

**Fonte inicial:** usar apenas dados oficiais já ingeridos que descrevem o conteúdo substantivo da proposição computável pelo matcher: identificação legislativa, tipo, ementa, ementa detalhada quando houver e keywords. Temas oficiais, status de tramitação e contexto da votação de referência ficam fora do prompt e do `sourceHash`, porque ajudam navegação, contexto processual e matcher, mas não definem o conteúdo a ser resumido. O PDF de `url_inteiro_teor` fica fora do fluxo inicial e pode entrar depois como fallback ou enriquecimento controlado, caso a qualidade dos resumos com dados ingeridos seja insuficiente.

**Execução inicial:** a geração roda em comando separado da ingestão, por exemplo `pnpm --filter api generate:proposicao-resumos`, consultando as proposições computáveis e suas fontes já persistidas. O comando é incremental por padrão, mas aceita recortes operacionais como `--year`, `--limit` e `--external-id-proposicao` para gerar lotes pequenos, um ano específico ou uma proposição pontual. O pipeline de ingestão continua responsável apenas por dados oficiais estruturados, sem depender de fornecedor de IA, chave externa, custo por chamada ou revisão humana.

**Primeiro corte implementável:** antes de integrar OpenRouter, implementar o schema dos JSONs, cálculo de `sourceHash`, tabela `proposicao_resumo_ia`, importador JSON para a projeção relacional e API lendo apenas resumos aprovados com hash atual. A geração real por IA entra depois, quando armazenamento, vínculo por `proposicao.id` e contrato público já estiverem validados.

**Modelo e provedor:** usar OpenRouter como provedor inicial, mas deixar o modelo configurável por variável de ambiente, por exemplo `PROPOSICAO_RESUMO_MODEL`. O modelo específico não fica fixado no roadmap, porque preço, qualidade e disponibilidade mudam rápido; cada item gerado registra o `model` usado para preservar a proveniência.

**Saída do modelo:** o prompt exige JSON estrito validado por schema, sem texto livre ao redor. Respostas válidas retornam `generationStatus` igual a `generated`, `resumoCard` e `resumoDetalhe`; quando a fonte não bastar, retornam `generationStatus` igual a `insufficient_source` e uma justificativa curta. Respostas fora do schema são tratadas como `error` pelo comando e não entram no frontend.

**Limites de texto:** `resumoCard` tem até 180 caracteres, em uma frase. `resumoDetalhe` tem até 900 caracteres, em um ou dois parágrafos. Ambos usam português brasileiro, tom neutro e linguagem acessível, sem juízo de valor nem afirmações sobre importância, polêmica ou intenção política da proposição. O prompt pede apenas o resumo do conteúdo fornecido, sem solicitar apelidos populares, contexto externo ou conhecimento fora dos campos de fonte.

**Política de regeneração:** o comando é incremental por padrão. Proposições sem resumo geram um item novo `pending`; itens com `sourceHash` igual são preservados; itens com `sourceHash` diferente são marcados como `stale` no próprio JSON, sem sobrescrever o texto aprovado; regeneração de itens existentes exige flag explícita, para evitar custo desnecessário e troca silenciosa de conteúdo já revisado. O importador para o banco apenas projeta o estado canônico do JSON.

**Armazenamento inicial:** salvar os resumos fora do banco, em arquivos JSON agrupados por `proposicao.ano`, por exemplo `apps/api/data/generated/proposicao-resumos/{ano}.json`. Esse agrupamento usa o ano do identificador legislativo da proposição, não `dataApresentacao`, e evita tanto um arquivo único grande quanto um arquivo por proposição. Dentro de cada arquivo, `items` é um objeto indexado por `externalIdProposicao` representado como string JSON, permitindo lookup e upsert por proposição específica. Cada item guarda `sourceHash`, calculado com normalização estável sobre `externalIdProposicao`, `siglaTipo`, `numero`, `ano`, `descricaoTipo`, `ementa`, `ementaDetalhada` e `keywords`, para detectar mudança do texto-base após reingestões. O item separa `generationStatus` (`generated`, `insufficient_source` ou `error`) de `reviewStatus` (`pending`, `approved`, `rejected` ou `stale`), para distinguir falha ou insuficiência da IA de rejeição humana. A primeira versão guarda apenas o estado atual do resumo e metadados mínimos, sem histórico completo de versões; quando um item fica `stale`, o texto antigo é preservado no próprio item até nova revisão ou regeneração. A pasta gerada deve ficar fora do Git, como dado operacional reconstruível/preservável entre reingestões conforme política de deploy.

**Projeção no banco:** um fluxo separado lê os JSONs, usa `externalIdProposicao` apenas para encontrar a proposição correta na tabela `proposicao`, e grava uma projeção na tabela `proposicao_resumo_ia` vinculada por `proposicao.id` (`proposicaoResumoIa` em TypeScript). A tabela de projeção não duplica `externalIdProposicao`, porque a entidade referenciada já é modelada como `proposicao`; o vínculo persistido é a FK interna `proposicao_id`, única por proposição. A importação projeta todos os estados do JSON (`pending`, `approved`, `rejected`, `stale`, `insufficient_source` e `error`) para preservar inspeção operacional, mas a API expõe apenas resumos `approved` com `sourceHash` atual. A API lê essa projeção relacional, não os JSONs diretamente; depois de uma reingestão completa, os JSONs revisados podem ser importados de novo para revincular os resumos às novas linhas internas.

**Escopo inicial:** gerar um resumo de uma linha para o card e um resumo de um ou dois parágrafos para o detalhe da proposição. Classificação "Quem é afetado" fica em tier posterior, porque é mais arriscada e depende do resumo estar maduro.

**Contrato de leitura:** a API expõe disponibilidade explícita, sem o frontend inferir por string vazia ou ausência de campo. No card, `resumoIaDisponivel` indica se há resumo aprovado e atual, e `resumoIaCard` traz o texto curto ou `null`. No detalhe, `resumoIaDisponivel` usa a mesma regra, `resumoIaCard` pode reutilizar o texto curto e `resumoIaDetalhe` traz o texto de um ou dois parágrafos ou `null`.

**Revisão inicial:** sem backoffice ou UI administrativa. A revisão humana acontece editando o JSON gerado, alterando `reviewStatus` para `approved` ou `rejected` e preenchendo `reviewedAt`. Uma ferramenta de revisão só entra depois se o volume ou o número de revisores justificar.

**Mitigação de risco de alucinação:**
- Disclaimer visível de que o resumo é gerado por IA
- Link sempre destacado para a fonte original
- Prompt cuidadosamente desenhado para ser neutro e evitar interpretações
- Processo de revisão obrigatório antes da exposição em produção: todo resumo gerado começa com `reviewStatus` igual a `pending` e só pode aparecer no frontend quando estiver `approved` e com `sourceHash` atual; resumos `pending`, `rejected` ou `stale` mantêm o fallback atual com `ementa` no card e sem resumo detalhado por IA
- Resumo aprovado fica `stale` quando uma reingestão muda o `sourceHash`, preservando o texto antigo para comparação, mas removendo-o da exposição pública até nova revisão

### Compartilhamento otimizado para WhatsApp e Twitter

Geração dinâmica de imagens OpenGraph por conteúdo. Cada tipo de página (perfil de político, resultado de matcher, evento, comparativo) tem seu template visual próprio.

**Formato técnico:**
- Meta tags OpenGraph para WhatsApp e LinkedIn
- Tags `twitter:card` para Twitter/X
- Imagens 1200x630 (formato padrão que serve os dois)

**Escopo:**
- Card para resultado do matcher: foto do deputado mais compatível, % de compatibilidade, estado e partido
- Card para perfil do político: foto, nome, partido, estado, informações essenciais
- Card para evento: título da proposição, data, resultado
- Card para comparativo: informações lado a lado de 2-3 políticos

**Fora de escopo:** cards específicos para stories de Instagram/Facebook. A cultura de compartilhamento político no Brasil é majoritariamente via WhatsApp e Twitter; stories tem dinâmica diferente e ROI duvidoso.

### Export do candidato escolhido

Após o usuário rodar o matcher e identificar um candidato com alta compatibilidade, oferecer opção de salvar para o dia da votação.

**Escopo:**
- Card de imagem com nome, número de urna, partido e cargo — salvável na galeria do celular
- Possibilidade de lembrete `.ics` para calendário com os números escolhidos

**Dependência:** exige dados de candidatura atual, preferencialmente via TSE/DivulgaCandContas. Não entra no MVP porque número de urna e candidatura vigente não vêm dos CSVs da Câmara.

**Racional:** conecta diretamente com a missão do produto (ajudar a decidir o voto), mas só é confiável quando o produto souber que o deputado é candidato naquele pleito e qual número de urna está vigente.

---

## Tier 2 — Profundidade

Expansão do que o produto já oferece, seja em detalhamento de políticos ou em cobertura institucional.

### Perfil completo do político

Adicionar ao perfil essencial do MVP os dados complementares que ficaram fora:
- Gastos da cota parlamentar (com normalização por distância do estado a Brasília, quando exibido em ranking)
- Projetos apresentados como autor principal
- Projetos aprovados (distinto de apresentados)
- Frentes parlamentares de que participa
- Cargos em comissões atuais e históricos
- Emendas parlamentares (bancada vs. individuais)
- Relatorias de projetos

Cada item é um sub-projeto próprio de ingestão e apresentação.

### Busca e listagem de deputados

Criar uma experiência pública para encontrar deputados por nome, partido e UF, apontando para o **Perfil do deputado**. Fora do MVP-3 para evitar abrir uma experiência de descoberta própria antes de validar os acessos vindos do matcher e antes da integração com candidatos novos.

### Indicador de alinhamento com orientação no detalhe do voto

Ao exibir o voto de um deputado em uma votação específica (no perfil do deputado ou no detalhe da votação), mostrar se ele seguiu ou votou contra a orientação efetiva da sua bancada. A orientação efetiva é resolvida pela cascata partido individual → federação → não computável, conforme ADR 0005.

**Apresentação:**
- Indicador visual ao lado do voto (ex.: "seguiu orientação", "votou contra orientação", "sem orientação computável")
- Quando aplicável, sigla da bancada que orientou (partido ou federação)
- Quando a orientação é "Liberado" pela bancada, indicar explicitamente

**Cobertura esperada:** com base na análise de 2025, aproximadamente 18% dos pares (deputado, votação) de plenário terão alinhamento computável. Partidos que delegam orientação a bloco (MDB, PP, PODE, PSD, REPUBLICANOS, UNIÃO, PSDB, CIDADANIA) terão cobertura quase nula — limitação documentada e explicitada na UI.

**Não entra no MVP:** o MVP exibe a orientação de cada bancada como contexto da votação, mas não vincula essa orientação ao voto individual de cada deputado. Esta feature é a evolução natural depois de o MVP estar no ar.

**Fora de escopo (descartado, condicional à fonte de dados):** ranking de "quem quebra mais disciplina" e disciplina partidária como fator no ranking público ou no matcher. Esses usos exigiriam cascata de três níveis incluindo bloco, que depende de histórico estruturado de composição de bloco que a Câmara não disponibiliza. Reconsiderar apenas se essa fonte estruturada for publicada.

### Senado Federal

Expansão horizontal da cobertura para a segunda casa do Congresso. Senado cobre decisões estruturantes (aprovação de ministros do STF, tratados internacionais, PECs em segundo turno) que não passam pelo matcher se só há Câmara.

**Por que Tier 2 e não Tier 1:** a decisão foi profundar na Câmara antes de expandir. Aprender em profundidade a modelagem e as armadilhas dos dados de uma casa antes de replicar para outra reduz retrabalho.

**Trabalho esperado:**
- API do Senado (`legis.senado.leg.br/dadosabertos`) tem estrutura análoga à da Câmara
- Adaptar schema para acomodar senadores e votações do Senado (mandato de 8 anos, não 4)
- Regra de ranking calibrada separadamente para o Senado

### Rankings justos

Rankings que medem escolhas ativas do deputado, não situações pessoais.

**Entram nesta fase:**
- Projetos apresentados como autor
- Projetos aprovados
- Alinhamento partidário em votações relevantes

**Ficam fora até resolver contextualização:**
- Faltas com justificativa (risco de injustiça com licenças médicas e maternidade)
- Gastos da cota parlamentar (risco de injustiça regional)

Essas duas podem voltar em tier posterior, com normalização ou separação por tipo de justificativa.

---

## Tier 3 — Integração TSE e candidatos novos

Missão central do produto: ajudar o usuário a decidir em quem votar, incluindo candidatos que não têm histórico na Câmara.

### Página de candidato novo com propostas de campanha

Integração com TSE / DivulgaCandContas para exibir informações de candidatos em primeira eleição federal, vereadores e deputados estaduais tentando vaga federal, senadores em primeira eleição, etc.

**Cruzamento de identidades:**
- Deputados já na base: vincular ao registro existente, adicionar número de urna e dados de candidatura atual
- Candidatos novos: criar perfil apenas com dados do TSE

**Informações exibidas para candidatos novos:**
- Dados pessoais básicos
- Partido, cargo pretendido, número de urna
- Propostas de campanha (PDFs do TSE)
- Patrimônio declarado (quando disponível)

**Escopo intencionalmente limitado:** candidatos novos **não entram no matcher** neste tier. Não têm histórico de votos para comparar. Aparecem como perfis consultáveis, não como resultados de compatibilidade.

### Mensagem inteligente no matcher quando não há bom match

Quando o matcher não encontra deputado em atividade com compatibilidade alta para o usuário, encorajar pesquisa por candidatos novos que não estão na base de votos.

Converte frustração ("meu representante não me representa") em ação cívica ("considere estes candidatos novos").

### Comportamento quando usuário pesquisa candidato fora da base

**Comportamento permanente desde o MVP:** se o usuário pesquisa por nome que não está no sistema, exibir mensagem explicando que são mapeados apenas deputados que já estiveram em atividade na Câmara.

**Evolução com este tier:** quando a integração TSE estiver ativa, a mesma pesquisa retorna a página do candidato novo, se ele existir no TSE.

### "Descubra seu candidato" como fluxo plenamente funcional

Rebranding do produto para deixar explícita a missão. O matcher passa a oferecer, junto aos resultados de deputados em atividade, referências aos candidatos novos relevantes ao estado do usuário (ainda sem cálculo de compatibilidade para estes).

---

## Tier 4 — Features secundárias

Features de valor reconhecido mas que não servem diretamente a missão principal ou que dependem de volume de uso para funcionar bem.

### Modo "Avalie seu representante"

Segundo ponto de entrada para a engine de matching, com comportamento distinto do "Quem vota com você":

- Foco em deputados em atividade no mandato atual
- Eventos disponíveis restritos ao mandato vigente do deputado
- Copy e framing voltados para accountability contínua, não decisão eleitoral

Importante para quem quer acompanhar o representante que já elegeu, mas secundário à missão de ajudar a escolher.

### Cobertura midiática via GDELT

Avaliar intensidade de cobertura midiática como sinal externo para uma eventual evolução editorial do ranking público, usando GDELT Project via Google BigQuery.

**Pré-requisito:** validar experimentalmente se o sinal GDELT adiciona informação útil além do ranking atual por volume de votações nominais em plenário. Se for redundante, descartar. Se for complementar, documentar nova decisão metodológica antes de integrar.

**Trabalho previsto:**
- Conta Google Cloud com BigQuery habilitado
- Queries para a tabela pública `gdelt-bq.gdeltv2.gkg` para cada proposição com apelido
- Normalização de contagens (escala logarítmica provavelmente)
- Incorporação como sinal complementar apenas se houver revisão explícita da regra do ranking público

**Limitações conhecidas:**
- Tradução automática introduz ruído em nomes de apelidos brasileiros
- Cobertura regional brasileira é boa mas não exaustiva
- Funciona bem só para proposições com apelido consolidado

### Feed editorial de proposições recentes

Versão expandida do ranking de proposições importantes, com linguagem editorial e posts explicando cada proposição votada relevante. "Ontem a Câmara votou X, e seu deputado votou Y."

Demanda atenção de produto e comunicação, não só engenharia. Faz sentido quando o produto já tem tração.

### Termômetro de representatividade

Feature de dados agregados anonimizados: "X% dos usuários do seu estado discordam de como seus deputados votaram na PEC Y." Matching inverso agregado.

**Pré-requisito cumprido no MVP:** a coleta de dados anonimizados (apenas estado + votos do matcher) começa desde o dia zero do MVP, mesmo sem a feature estar exposta. Quando esta feature for implementada, já haverá volume de dados para alimentá-la.

### Classificação "Quem é afetado" via IA

Classificação automática de quais perfis de cidadão são mais impactados por cada proposição: servidores públicos, aposentados, CLT, autônomos, estudantes, militares, moradores de pequenos municípios (via cruzamento com tabela IBGE), etc.

**Pré-requisito:** Resumo por IA (Tier 1) estar maduro e validado antes desta feature entrar. Classificação é mais arriscada do que resumo.

**Mitigações:**
- Disclaimer explícito de que a classificação é gerada por IA
- Revisão manual dos casos-limite antes de exposição em produção
- Tabela IBGE em cache para classificações por porte municipal

### Listar votações não nominais na tela de informação de uma proposição

Caso uma proposição não tenha votações nominais, é possível listar as votações não nominais com dados retornados pela api, já que esses dados não serão ingeridos

---

## Tier 5 — Features pós-login

Features que só funcionam com usuários autenticados recorrentes. Dependem de massa crítica de uso.

### Favoritar políticos

Usuário salva políticos de interesse para acompanhamento rápido.

### Alertas de novas votações

Notificação quando um político favoritado vota em proposição nova, especialmente se a proposição estiver bem posicionada no ranking público.

---

## Tier 6 — Expansão horizontal

Expansão da cobertura para câmaras estaduais e municipais, seguindo o roadmap original do brainstorm.

### ALESP (piloto estadual)

Assembleia Legislativa de São Paulo como primeiro caso estadual. Escolhida por relevância do estado e por coincidir com a localização do projeto.

**Desafios esperados:**
- API estadual com estrutura distinta da federal
- Menor padronização de dados
- Volume de votações diferente, pode exigir recalibração da fórmula

### Sistema multi-câmara com adaptadores abertos

Arquitetura que permite contribuições externas para adicionar cobertura de outras assembleias estaduais e câmaras municipais.

**Princípio:** cobertura dirigida por geolocalização do usuário, não cobertura global exaustiva. O sistema expande para as câmaras que atendem o lugar onde estão os usuários reais.

---

## Investigação concluída: orientações de bancada

Análise exploratória realizada sobre os dados de orientações de bancada de 2025 (`votacoesOrientacoes-2025.csv` e API `/votacoes/{id}/orientacoes`). Documenta as descobertas e decisões tomadas para uso futuro.

### Estrutura dos dados de orientação

Os dados de orientação contêm recomendações de voto de três tipos de bancada:

- **Partidos individuais** (PT, PL, NOVO, PDT, PSB, etc.) — orientam diretamente seus deputados. Cobertura no CSV: 29% dos registros.
- **Federações e blocos** — quando um partido pertence a uma federação ou bloco, a orientação vem do agrupamento, não do partido individual. Cobertura: 16% federações, 15% blocos.
- **Lideranças suprapartidárias** (Governo, Oposição, Maioria, Minoria) — posicionamentos políticos que não representam a bancada partidária de nenhum deputado específico. Cobertura: 40% dos registros.

### Achado central: blocos substituem partidos

Quando um bloco ou federação orienta, nenhum partido membro orienta separadamente na mesma votação. Isso foi verificado em 100% dos 1.537 registros de bloco/federação de 2025. Consequência: para vincular a orientação ao deputado, é obrigatório manter uma tabela de composição de blocos/federações.

### Cobertura para pares deputado-votação (Plenário)

Reanálise em 2025 (171.217 pares em plenário, legislatura 57) com metodologia corrigida:

- Cascata partido individual → federação: 17,78% dos pares têm orientação resolvível
- Cascata partido individual → federação → bloco (com composição corrente da API): 36,09% dos pares — os 18 pontos extras vêm exclusivamente do bloco 589, único bloco com composição preenchida pela API


### Federações: composição estável

As 3 federações da legislatura 57 (2023-2027) são registradas no TSE e têm composição fixa por lei:

- Fdr PT-PCdoB-PV: PT, PCdoB, PV (registrada em 24/05/2022)
- Fdr PSOL-REDE: PSOL, REDE (registrada em 26/05/2022)
- Fdr PSDB-CIDADANIA: PSDB, CIDADANIA (registrada em 26/05/2022)

Fonte: TSE (`tse.jus.br/partidos/federacoes-registradas-no-tse`). Não há API estruturada — a composição é hardcoded por legislatura.

### Blocos: composição variável e não modelada

Blocos mudam de composição ao longo da legislatura, e a investigação de 2025 confirmou que reconstruir essa composição com integridade não é viável com as fontes atuais da Câmara:

- Endpoint `/blocos?idLegislatura=57` retorna 7 blocos da legislatura (formados e extintos), mas `/blocos/{id}/partidos?data=...` não retorna composições históricas distintas — o parâmetro `data` existe na documentação, mas em testes retorna sempre a mesma composição independentemente da data consultada
- Vários blocos retornam composição vazia (`Bl AvanSolidPrd...` / bloco 590; também 587 e 588)
- No endpoint `/votacoes/{id}/orientacoes`, o campo `codPartidoBloco` vem `null` para blocos e federações — chave estruturada de vinculação não está disponível
- Rótulos no CSV aparecem truncados (`Bl AvanSolidPrd...`), e reconstrução por inferência via votos alinhados é ruidosa por design

Decisão (ADR 0005): blocos não são modelados como entidade com composição. Cada orientação de bloco é armazenada bruta — `siglaBancada`, `uriBancada`, `orientacaoVoto` — vinculada à votação específica em que ocorreu. Blocos aparecem como contexto da votação, sem cascateamento para o deputado individual.

### Valores de orientação

| Valor | Significado para disciplina |
| --- | --- |
| Sim, Não | Comparável com voto do deputado |
| Obstrução | Comparável (deputado deveria obstruir) |
| Liberado | Não computável — bancada liberou, não há expectativa disciplinar |
| (vazio) | Não computável — orientação não registrada |

### Lideranças suprapartidárias: decisão

Governo, Oposição, Maioria e Minoria **não entram na cascata de orientação aplicada ao deputado**. Não representam a bancada formal do deputado. São armazenadas e exibidas como contexto da votação (como cada liderança se posicionou), disponíveis no detalhe da votação e no perfil da proposição. Tratamento alinhado com o que se aplica a blocos partidários conforme ADR 0005.

### Disciplina partidária no ranking e no matcher — descartada

A quebra de disciplina partidária como fator do ranking público ou como base de ranking ("quem mais quebra disciplina") foi descartada do roadmap após a análise de cobertura de orientações de 2025.

Motivo: a cobertura de orientação por par (deputado, votação) em cascata estável (partido + federação) é de apenas 17,78% em plenário. Para chegar a 36,09%, seria necessário incluir blocos na cascata, mas a Câmara não disponibiliza histórico estruturado de composição de blocos — endpoint `/blocos/{id}/partidos?data=...` não retorna composições históricas distintas, e vários blocos retornam composição vazia. Reconstrução por inferência exigiria curadoria manual recorrente.

Esta feature só será reconsiderada se a Câmara publicar fonte estruturada de histórico de composição de blocos que torne a cascata de três níveis viável de forma automatizada e auditável. Até lá, blocos permanecem armazenados como entidade orientadora em votações específicas (para exibição como contexto), sem composição modelada.

---

## Itens em estudo permanente

Itens que não são features únicas mas evoluções contínuas do produto, que devem ser revisitados conforme o produto amadurece.

### Refinamento do ranking público

Revisão contínua da regra de ranking conforme o uso em produção revelar casos que não ranqueiam bem. A regra atual é volume de votações nominais em plenário; novos sinais só devem entrar com decisão metodológica documentada.

### Refinamento do matcher para amostra desigual

Evolução do tratamento de casos-limite no matcher:
- Threshold mínimo de votos efetivos para aparecer nos primeiros resultados
- Apresentação de intervalo de confiança estatística por deputado
- Ordenação secundária que considera tamanho de amostra, não só %

### Expansão de rankings conforme contextualização amadurece

Trazer de volta rankings que estão fora por risco de injustiça (faltas com justificativa, gastos da cota) quando o produto tiver mecanismos adequados de contextualização e normalização.
