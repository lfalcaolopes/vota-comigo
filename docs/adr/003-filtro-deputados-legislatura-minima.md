# Filtro de deputados por legislatura mínima

Apenas deputados com `idUltimaLegislatura >= 51` são importados a partir de `deputados.csv`. Deputados cuja última legislatura é anterior à 51 são descartados na ingestão e não entram no banco.

O motivo é que a Câmara só disponibiliza arquivos de votos de deputados a partir de 2001, o que corresponde ao início da legislatura 51 (1999–2003) considerando o primeiro ano da legislatura como ponto de corte prático dos dados. Legislaturas anteriores não têm comportamento de voto publicamente documentado, e o produto se sustenta inteiramente sobre esse comportamento — perfis sem voto não têm utilidade analítica e contaminariam buscas, rankings e o matcher com registros vazios. A alternativa de importar todos e filtrar em runtime foi rejeitada porque forçaria filtros defensivos em todos os consumidores do dado e ainda pagaria custo de banco para registros sem valor.

Revisitar este ADR se a Câmara liberar dados de votação anteriores a 2001 ou se a régua de "voto documentado" mudar.