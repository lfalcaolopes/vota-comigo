import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';

export const PROPOSICAO_RESUMO_IA_PROMPT_VERSION = 'v3';

export function buildProposicaoResumoIaPrompt(
  source: ProposicaoResumoIaSource,
): string {
  const tipo = [source.siglaTipo, source.numero, source.ano]
    .filter(Boolean)
    .join('/');
  const descricao = source.descricaoTipo ?? '';
  const hasInteiroTeor = source.urlInteiroTeor !== null;

  const fonteInstrucao = hasInteiroTeor
    ? '- O documento PDF anexado é o inteiro teor desta proposição; baseie o resumo PRINCIPALMENTE no texto do PDF'
    : '- NÃO use apelidos, contexto externo ou suposições além do texto fornecido';

  return `Você explica proposições legislativas para cidadãos brasileiros comuns, sem formação jurídica, numa plataforma de transparência política. Seu objetivo é responder, em linguagem simples: o que essa proposição muda na prática e quem é afetado. Responda EXCLUSIVAMENTE com um objeto JSON válido no formato especificado.

PROPOSIÇÃO:
Tipo: ${tipo} (${descricao})

INSTRUÇÕES:
${fonteInstrucao}
- Escreva em português do Brasil, tom neutro e objetivo.
- Descreva o que a proposição ESTABELECE em termos absolutos (o que ela cria, exige, proíbe, autoriza, fixa, destina), não o que ela "muda" em relação à regra atual — você não tem acesso ao estado atual da lei. Só descreva uma alteração relativa se o próprio texto a declarar.
- Evite jargão. Ao citar uma lei conhecida, explique em poucas palavras o que ela é (ex.: "ICMS, imposto estadual sobre consumo").
- NÃO use números de artigos, incisos, parágrafos, "ADCT" ou referências cruzadas como conteúdo principal: o cidadão não sabe o que eles contêm.
- Baseie-se SOMENTE no texto fornecido. Não invente efeitos, números, beneficiários, apelidos ou contexto que não estejam no arquivo. Traduzir o texto para linguagem simples é permitido; acrescentar fatos novos não é.
- Se o arquivo for vago demais para explicar o efeito prático sem inventar, use status "insufficient_source".
- "resumoCard": uma frase com o efeito central, legível de relance numa listagem.
- "resumoDetalhe": de 2 a 4 bullet points cobrindo o efeito, quem é afetado e o que muda. Cada bullet em sua própria linha, começando por "- " (hífen e espaço). Separe os bullets com "\n" dentro da string JSON. Não escreva parágrafos corridos nem use outros marcadores.

FORMATO DE RESPOSTA (JSON estrito, sem texto adicional):
{
  "status": "generated" | "insufficient_source",
  "resumoCard": "<string>" | null,
  "resumoDetalhe": "- <bullet 1>\n- <bullet 2>" | null
}

Quando status for "generated": resumoCard e resumoDetalhe devem ser preenchidos.
Quando status for "insufficient_source": resumoCard e resumoDetalhe devem ser null.`;
}
