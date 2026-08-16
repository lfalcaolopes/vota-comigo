import type { DeputadoFaixaEtaria } from '@vota-comigo/shared-types';

// Limites em data de nascimento, não em idade calculada por linha: a coluna
// entra na comparação como está e o filtro continua indexável.
export type IntervaloNascimento = {
  readonly nascidoApos: string | null;
  readonly nascidoAte: string | null;
};

const IDADE_MINIMA: Record<DeputadoFaixaEtaria, number | null> = {
  'ate-39': null,
  '40-49': 40,
  '50-59': 50,
  '60-69': 60,
  '70-mais': 70,
};

const IDADE_MAXIMA: Record<DeputadoFaixaEtaria, number | null> = {
  'ate-39': 39,
  '40-49': 49,
  '50-59': 59,
  '60-69': 69,
  '70-mais': null,
};

export function deriveIntervaloNascimento(
  faixa: DeputadoFaixaEtaria,
  referencia: string,
): IntervaloNascimento {
  const idadeMinima = IDADE_MINIMA[faixa];
  const idadeMaxima = IDADE_MAXIMA[faixa];

  return {
    // Quem já passou da idade máxima nasceu antes deste dia, então o limite é
    // exclusivo: quem nasceu nele faz aniversário hoje e ainda pertence à faixa.
    nascidoApos:
      idadeMaxima === null ? null : subtrairAnos(referencia, idadeMaxima + 1),
    nascidoAte:
      idadeMinima === null ? null : subtrairAnos(referencia, idadeMinima),
  };
}

function subtrairAnos(referencia: string, anos: number): string {
  const [year, month, day] = referencia.split('-').map(Number);
  return new Date(Date.UTC(year - anos, month - 1, day))
    .toISOString()
    .slice(0, 10);
}
