export function formatGastoCotaAmount(amountUsedCents: number): string {
  const signal = amountUsedCents < 0 ? "-" : "";
  const digits = String(Math.abs(amountUsedCents)).padStart(3, "0");
  const reais = Number(digits.slice(0, -2)).toLocaleString("pt-BR");
  const centavos = digits.slice(-2);
  return `${signal}R$ ${reais},${centavos}`;
}
