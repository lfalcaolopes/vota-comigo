# Persistência de votos por votação em JSONB

Os votos individuais de `votacoesVotos-{ano}.csv` são parte do core do produto: alimentam o matcher, o perfil do deputado e o comparativo. Deixar essa leitura dependente de `GET /votacoes/{id}/votos` manteria o fluxo principal vulnerável à disponibilidade e à latência da API da Câmara. Por isso, os votos individuais são ingeridos e persistidos localmente.

A persistência não usa uma linha por `(votacao_id, deputado_id)`. Essa modelagem relacional facilitaria consultas reversas por deputado, mas levaria a milhões de registros no histórico completo e não favorece o caminho principal do produto, que é carregar todos os votos de uma votação. A decisão é persistir uma linha por votação nominal, em uma tabela derivada `votacao_votos`, com os votos agrupados em uma coluna `votos_json` em JSONB.

O JSON agrupa votos por categorias normalizadas: `sim`, `nao`, `abstencao`, `obstrucao`, `artigo_17` e `nao_informado`. O valor `Artigo 17` entra em `artigo_17` e é tratado como ausência justificada/neutra no matcher. Registros com `voto` vazio entram em `nao_informado`, não contam como voto efetivo no matcher e devem aparecer no resumo de qualidade da ingestão para investigação.

O volume de linhas fica proporcional ao número de votações nominais, não ao número de votos individuais. A projeção atual é de cerca de 13.750 linhas para 25 anos, com tamanho total estimado em dezenas de MB. Consultas reversas do tipo "todos os votos do deputado X em N votações" ficam menos diretas do que em uma tabela relacional; se esse caminho virar gargalo real, adicionar índice GIN em `votos_json` ou uma projeção relacional derivada passa a ser uma otimização possível, sem mudar a fonte canônica.

Atualizações de voto específico reescrevem o JSON da votação inteira. Esse custo é aceito porque votações históricas são praticamente imutáveis e reingestões são feitas por arquivo/ano, não por edição transacional de voto individual.

As alternativas rejeitadas foram manter votos fora do banco com API/cache e persistir apenas votos das top 100 votações. A primeira preserva dependência externa no core do produto. A segunda reduz volume, mas mantém a dependência da API para buscas e comparativos fora desse recorte.
