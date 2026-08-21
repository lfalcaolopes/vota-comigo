// O servidor roda em UTC, então a data crua viraria a amostra às 21h no
// horário de Brasília, no meio do dia de quem lê.
const diaEmBrasilia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toDiaIndex(agora: Date): number {
  const partes = diaEmBrasilia.formatToParts(agora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes): number =>
    Number(partes.find((parte) => parte.type === tipo)?.value);

  return Math.floor(
    Date.UTC(valor("year"), valor("month") - 1, valor("day")) / 86_400_000,
  );
}

export function toOffsetAmostraDiaria(
  diaIndex: number,
  total: number,
  tamanho: number,
): number {
  if (total <= tamanho) return 0;

  const janelas = Math.ceil(total / tamanho);
  const janela = ((diaIndex % janelas) + janelas) % janelas;

  // A última janela é parcial quando o total não é múltiplo do tamanho, então
  // ela recua e a seção nunca mostra menos linhas do que nos outros dias.
  return Math.min(janela * tamanho, total - tamanho);
}
