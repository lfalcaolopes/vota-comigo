import type { UsoCotaLegislatura } from '@/shared/cota/uso-cota';

// A janela do agregado é a do mandato em curso. Fora de qualquer legislatura —
// entre uma e outra, ou depois da última carregada — vale a última já iniciada,
// porque é dela que o dado da cota fala.
export function selectLegislaturaAtual(
  legislaturas: readonly UsoCotaLegislatura[],
  referencia: string,
): UsoCotaLegislatura | null {
  return (
    [...legislaturas]
      .filter((item) => item.dataInicio <= referencia)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))[0] ?? null
  );
}
