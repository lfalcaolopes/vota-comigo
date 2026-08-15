export type CoberturaCotaSigepa = {
  readonly sigepaReposto: boolean;
  readonly sigepaCoveredThroughMonth: number | null;
  readonly coveredThroughMonth: number;
};

// A completude é apurada contra um dump: se um dump posterior avança a
// cobertura do ano, passam a existir meses de SIGEPA que ninguém buscou, e o
// ano volta sozinho para não reposto em vez de seguir exibido como completo
// (ADR 022).
export function isAnoReposto(cobertura: CoberturaCotaSigepa): boolean {
  return (
    cobertura.sigepaReposto &&
    cobertura.sigepaCoveredThroughMonth !== null &&
    cobertura.sigepaCoveredThroughMonth >= cobertura.coveredThroughMonth
  );
}
