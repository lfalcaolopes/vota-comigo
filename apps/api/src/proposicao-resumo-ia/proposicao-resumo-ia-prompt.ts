import type { ProposicaoResumoIaSource } from '../proposicoes/rules/proposicao-resumo-ia-source';

export const PROPOSICAO_RESUMO_IA_PROMPT_VERSION = 'v1';

export function buildProposicaoResumoIaPrompt(
  source: ProposicaoResumoIaSource,
): string {
  const tipo = [source.siglaTipo, source.numero, source.ano]
    .filter(Boolean)
    .join('/');
  const descricao = source.descricaoTipo ?? '';
  const ementa = source.ementa ?? '';
  const ementaDetalhada = source.ementaDetalhada ?? '';
  const keywords = source.keywords ?? '';

  return `Você é um assistente especializado em legislação brasileira. Analise a proposição abaixo e responda EXCLUSIVAMENTE com um objeto JSON válido no formato especificado.

PROPOSIÇÃO:
Tipo: ${tipo} (${descricao})
Ementa: ${ementa}
${ementaDetalhada ? `Ementa detalhada: ${ementaDetalhada}` : ''}
${keywords ? `Palavras-chave: ${keywords}` : ''}

INSTRUÇÕES:
- Escreva em português do Brasil, tom neutro e objetivo
- NÃO use apelidos, contexto externo ou suposições além do texto fornecido
- Se as informações forem insuficientes para gerar um resumo útil, use status "insufficient_source"
- "resumoCard" deve ter no máximo 180 caracteres (texto curto para listagem)
- "resumoDetalhe" deve ter no máximo 900 caracteres (texto completo para página de detalhes)

FORMATO DE RESPOSTA (JSON estrito, sem texto adicional):
{
  "status": "generated" | "insufficient_source",
  "resumoCard": "<string até 180 chars>" | null,
  "resumoDetalhe": "<string até 900 chars>" | null
}

Quando status for "generated": resumoCard e resumoDetalhe devem ser preenchidos.
Quando status for "insufficient_source": resumoCard e resumoDetalhe devem ser null.`;
}
