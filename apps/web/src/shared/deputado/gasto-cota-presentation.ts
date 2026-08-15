const compactoFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

// Na grade do comparativo o centavo não decide nada e o valor cheio quebra a
// coluna; o perfil continua publicando o total exato.
export function formatGastoCotaCompacto(amountUsedCents: number): string {
  // O Intl separa "R$" do número com espaço não quebrável; o resto do produto
  // formata moeda com espaço comum.
  return compactoFormatter.format(amountUsedCents / 100).replace(/[  ]/g, " ");
}

export function formatGastoCotaAmount(amountUsedCents: number): string {
  const signal = amountUsedCents < 0 ? "-" : "";
  const digits = String(Math.abs(amountUsedCents)).padStart(3, "0");
  const reais = Number(digits.slice(0, -2)).toLocaleString("pt-BR");
  const centavos = digits.slice(-2);
  return `${signal}R$ ${reais},${centavos}`;
}
