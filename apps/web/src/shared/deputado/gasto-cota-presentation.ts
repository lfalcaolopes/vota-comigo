export const COTA_PARLAMENTAR_HELP =
  "A Cota para o Exercício da Atividade Parlamentar custeia as despesas do mandato, como passagens aéreas e conta de celular. O valor varia de estado para estado, porque grande parte da cota é gasta com passagens aéreas para Brasília. Algumas despesas são reembolsadas, como as com os Correios, e outras são pagas por débito automático, como a compra de passagens. Nos casos de reembolso, os deputados têm três meses para apresentar os recibos. O valor mensal não utilizado fica acumulado ao longo do ano - isso explica porque em alguns meses o valor gasto pode ser maior que o teto mensal.";

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
