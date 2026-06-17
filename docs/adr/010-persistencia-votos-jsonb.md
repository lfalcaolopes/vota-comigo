# Persistência de votos por votação em JSONB

Os votos individuais de `votacoesVotos-{ano}.csv` são parte do core do produto: alimentam o matcher, o perfil do deputado e o comparativo. Deixar essa leitura dependente de `GET /votacoes/{id}/votos` manteria o fluxo principal vulnerável à disponibilidade e à latência da API da Câmara. Por isso, os votos individuais são ingeridos e persistidos localmente.

A persistência não usa uma linha por `(votacao_id, deputado_id)`. Essa modelagem relacional facilitaria consultas reversas por deputado, mas levaria a milhões de registros no histórico completo e não favorece o caminho principal do produto, que é carregar todos os votos de uma votação. A decisão é persistir uma linha por votação nominal, em uma tabela derivada `votacao_votos`, com os votos agrupados em uma coluna `votos_json` em JSONB.

O JSON agrupa votos por categorias normalizadas: `sim`, `nao`, `abstencao`, `obstrucao`, `artigo_17` e `nao_informado`. O valor `Artigo 17` entra em `artigo_17` e recebe o mesmo tratamento de fora de exercício no matcher: não entra no denominador. Registros com `voto` vazio entram em `nao_informado`, não contam como voto efetivo no matcher e devem aparecer no resumo de qualidade da ingestão para investigação.

O volume de linhas fica proporcional ao número de votações nominais, não ao número de votos individuais. Consultas reversas do tipo "todos os votos do deputado X em N votações" ficam menos diretas do que em uma tabela relacional; se esse caminho virar gargalo real, adicionar índice GIN em `votos_json` ou uma projeção relacional derivada passa a ser uma otimização possível, sem mudar a fonte canônica.

## Validação empírica do trade-off de volume

A alternativa relacional (uma linha por `(votacao_id, deputado_id)`) foi prototipada e medida com a ingestão real de 2020 a 2025, em uma tabela `voto` paralela à `votacao_votos`, sem alterar a ingestão existente. Os números medidos:

- `votacao_votos` (JSONB, uma linha por votação): **2.657 linhas, 44 MB**.
- `voto` (relacional, uma linha por voto individual): **~1 milhão de linhas, 250 MB**.

Ou seja, a modelagem relacional custou cerca de **5,7x mais espaço em disco** e **três ordens de grandeza mais linhas** para o mesmo recorte. O ganho seria consultas reversas por deputado diretas e indexadas (`WHERE deputado_id = X`), além de preservar metadados por voto que o JSONB descarta (`dataHoraVoto`, `siglaUf`, `siglaPartido`).

A decisão é **não manter a tabela `voto`** e seguir com o JSONB como fonte canônica: no momento os contras (volume, ingestão mais pesada, segunda fonte de verdade a manter em sincronia) não justificam o benefício, dado que o caminho principal do produto continua sendo carregar todos os votos de uma votação. A decisão deve ser **revista caso as funcionalidades de presença passem a ser consideravelmente afetadas** pela leitura reversa por deputado — hoje feita carregando todos os blocos de plenário em memória para extrair o voto de um único deputado. Se esse custo virar gargalo medido, a projeção relacional derivada (ou um índice GIN) volta à mesa como otimização, sem mudar a fonte canônica.

Atualizações de voto específico reescrevem o JSON da votação inteira. Esse custo é aceito porque votações históricas são praticamente imutáveis e reingestões são feitas por arquivo/ano, não por edição transacional de voto individual.

As alternativas rejeitadas foram manter votos fora do banco com API/cache e persistir apenas votos das top 100 votações. A primeira preserva dependência externa no core do produto. A segunda reduz volume, mas mantém a dependência da API para buscas e comparativos fora desse recorte.
