// { mês: { numSubCota: centavos } }, o mesmo formato gravado em gastos_json.
export type GastoCotaMatriz = Record<string, Record<string, number>>;

export type GrupoGastoCota = {
  // null identifica o grupo Outras despesas.
  externalNumSubCota: number | null;
  anualCentavos: number;
  mensalCentavos: readonly number[];
};

const topCount = 5;

export function deriveGruposGastoCota(
  gastosJson: GastoCotaMatriz,
): readonly GrupoGastoCota[] {
  const mensalByNumSubCota = new Map<number, number[]>();

  for (const [month, categorias] of Object.entries(gastosJson)) {
    for (const [numSubCota, centavos] of Object.entries(categorias)) {
      const externalNumSubCota = Number(numSubCota);
      const mensalCentavos =
        mensalByNumSubCota.get(externalNumSubCota) ?? emptyMeses();

      mensalCentavos[Number(month) - 1] += centavos;
      mensalByNumSubCota.set(externalNumSubCota, mensalCentavos);
    }
  }

  const categorias = [...mensalByNumSubCota.entries()]
    .map(([externalNumSubCota, mensalCentavos]) => ({
      externalNumSubCota,
      anualCentavos: sumMeses(mensalCentavos),
      mensalCentavos,
    }))
    .sort(
      (a, b) =>
        b.anualCentavos - a.anualCentavos ||
        a.externalNumSubCota - b.externalNumSubCota,
    );

  const top = categorias.slice(0, topCount);
  const restante = categorias.slice(topCount);

  if (restante.length === 0) {
    return top;
  }

  const mensalCentavos = restante.reduce(
    (acumulado, categoria) =>
      acumulado.map((mes, index) => mes + categoria.mensalCentavos[index]),
    emptyMeses(),
  );

  return [
    ...top,
    {
      externalNumSubCota: null,
      anualCentavos: sumMeses(mensalCentavos),
      mensalCentavos,
    },
  ];
}

function sumMeses(mensalCentavos: readonly number[]): number {
  return mensalCentavos.reduce((total, mes) => total + mes, 0);
}

function emptyMeses(): number[] {
  return Array.from({ length: 12 }, () => 0);
}
