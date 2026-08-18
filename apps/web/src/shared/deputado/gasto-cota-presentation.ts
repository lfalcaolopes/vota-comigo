export const COTA_PARLAMENTAR_HELP =
  "A Cota para o Exercício da Atividade Parlamentar custeia as despesas do mandato, como passagens aéreas e conta de celular. O valor varia de estado para estado, porque grande parte da cota é gasta com passagens aéreas para Brasília. Algumas despesas são reembolsadas, como as com os Correios, e outras são pagas por débito automático, como a compra de passagens. Nos casos de reembolso, os deputados têm três meses para apresentar os recibos. O valor mensal não utilizado fica acumulado ao longo do ano - isso explica porque em alguns meses o valor gasto pode ser maior que o teto mensal. O teto usado na comparação vem da tabela por UF do Ato da Mesa em vigor e não inclui os adicionais mensais por cargo, como liderança, presidência de comissão e suplência na Mesa: passar de 100% do teto não significa gasto irregular.";

const CASAS_MAXIMAS = 3;

function compactoFormatter(fractionDigits: number): Intl.NumberFormat {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits === 1 ? 0 : fractionDigits,
  });
}

// Na grade do comparativo o centavo não decide nada e o valor cheio quebra a
// coluna; o perfil continua publicando o total exato.
export function formatGastoCotaCompacto(amountUsedCents: number): string {
  return formatCompacto(amountUsedCents, 1);
}

// Valores próximos colapsam na mesma string compacta ("R$ 2 mi de R$ 2 mi") e o
// leitor lê como erro. Abre casas decimais até que valores distintos apareçam
// distintos.
export function formatGastoCotaCompactoDistinto(
  amountsUsedCents: readonly number[],
): readonly string[] {
  const distintos = new Set(amountsUsedCents).size;

  for (let casas = 1; casas < CASAS_MAXIMAS; casas += 1) {
    const formatados = amountsUsedCents.map((cents) =>
      formatCompacto(cents, casas),
    );
    if (new Set(formatados).size === distintos) return formatados;
  }

  return amountsUsedCents.map((cents) => formatCompacto(cents, CASAS_MAXIMAS));
}

function formatCompacto(
  amountUsedCents: number,
  fractionDigits: number,
): string {
  // O Intl separa "R$" do número com espaço não quebrável; o resto do produto
  // formata moeda com espaço comum.
  return compactoFormatter(fractionDigits)
    .format(amountUsedCents / 100)
    .replace(/[  ]/g, " ");
}

export function formatGastoCotaAmount(amountUsedCents: number): string {
  const signal = amountUsedCents < 0 ? "-" : "";
  const digits = String(Math.abs(amountUsedCents)).padStart(3, "0");
  const reais = Number(digits.slice(0, -2)).toLocaleString("pt-BR");
  const centavos = digits.slice(-2);
  return `${signal}R$ ${reais},${centavos}`;
}
