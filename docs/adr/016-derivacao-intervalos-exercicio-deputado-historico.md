# Derivação de intervalos de exercício pelo histórico do deputado

Os intervalos de exercício são derivados sob demanda de `deputado_historico`, não de `votacao_votos`, de uma tabela materializada própria nem de consultas em tempo real à API da Câmara. A regra vale para qualquer votação nominal; o matcher é apenas um consumidor que a aplica às votações de referência. 

Um intervalo abre por posse ou reassunção, incluindo o padrão legado de primeira posse na legislatura, e fecha por saída, licença, suplência, fim de mandato, vacância ou registro legado de fim de legislatura. Eventos administrativos como convocação, snapshot inicial de legislatura e alteração de partido não alteram por si só a condição de exercício; alteração de partido apenas atualiza o partido vigente no tempo.

A condição de exercício é avaliada pela data e hora da votação quando disponível, com fallback para a data civil quando a fonte não traz hora; sem data utilizável, a votação vira lacuna de dados para esse cálculo. A decisão evita confiar apenas em `situacao`, porque a investigação mostrou registros legados e atuais em que `descricao_status` é o campo que melhor expressa a transição real, e adia materialização até existir gargalo real de consulta.

A derivação de intervalos permanece restrita ao `deputado_historico`, mas a classificação do par deputado/votação trata um registro em `votacao_votos` como evidência mais confiável de exercício: havendo voto registrado, o par é classificado pelo voto e o intervalo derivado é ignorado para esse efeito; o histórico só decide a condição quando não há registro de voto. A ordem canônica de classificação reflete essa precedência — voto antes do histórico — e está detalhada em `docs/ingestion/derivacao-exercicio-deputado.md`.
