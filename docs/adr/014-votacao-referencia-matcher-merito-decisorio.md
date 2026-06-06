# Votação de referência do matcher por mérito decisório

A votação de referência do matcher é escolhida priorizando **votos de mérito decisório** descritos pela Câmara, usando **fallback por turno** apenas quando o texto da votação não indica voto fragmentário, procedural ou redação final. Essa regra substitui a heurística simples de turno explícito porque a análise com dados ingeridos mostrou que turnos na abertura capturavam votos inflados por destaques, requerimentos e preliminares, enquanto uma regra puramente decisória perdia tipos inteiros como PDL e MPV.

O matcher não usa destaques, DTQs, requerimentos, recursos, dispensas, preferências, apreciações preliminares ou votos de manutenção/supressão de trecho como fallback para escolher a votação decisiva de referência de uma proposição. Redação final não é mérito decisório; pode existir apenas como fallback fraco quando não houver candidato melhor.

Essa classificação textual é uma heurística não persistida de escolha da votação de referência do matcher, não uma classificação regimental da votação. Ela não altera a decisão da ADR 009 de não modelar tipo regimental por regex.

A heurística operacional exata, incluindo regexes, prioridades, desempate e valores esperados de validação, fica documentada em `docs/matcher/votacao-referencia.md`.
