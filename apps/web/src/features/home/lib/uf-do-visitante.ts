// A borda da Vercel devolve a subdivisão ISO 3166-2 sem o prefixo do país, que
// para o Brasil já é a mesma sigla de estado usada pela Câmara.
export function toUfDoVisitante(
  country: string | null,
  region: string | null,
  ufsValidas: readonly string[],
): string | null {
  if (country?.toUpperCase() !== "BR" || region === null) return null;

  const siglaUf = region.toUpperCase();
  return ufsValidas.includes(siglaUf) ? siglaUf : null;
}
