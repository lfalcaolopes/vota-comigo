import type { DeputadoOrgao } from '@vota-comigo/shared-types';

export function sortDeputadoOrgaos(
  items: readonly DeputadoOrgao[],
): readonly DeputadoOrgao[] {
  return [...items].sort(compareOrgaos);
}

// Um órgão, não um vínculo: quem presidiu, foi titular e voltou como suplente
// no mesmo colegiado aparece uma vez, com o cargo de maior relevância e o
// período completo — as datas seguem conferíveis contra o portal da Câmara.
export function dedupOrgaosDaJanela(
  items: readonly DeputadoOrgao[],
): readonly DeputadoOrgao[] {
  const porOrgao = new Map<number, DeputadoOrgao>();

  for (const item of items) {
    const anterior = porOrgao.get(item.externalIdOrgao);
    porOrgao.set(
      item.externalIdOrgao,
      anterior === undefined ? item : mesclarVinculos(anterior, item),
    );
  }

  return [...porOrgao.values()];
}

function mesclarVinculos(
  left: DeputadoOrgao,
  right: DeputadoOrgao,
): DeputadoOrgao {
  const vencedor =
    getPresentationGroup(right.titulo) < getPresentationGroup(left.titulo)
      ? right
      : left;

  return {
    ...vencedor,
    dataInicio:
      left.dataInicio <= right.dataInicio ? left.dataInicio : right.dataInicio,
    dataFim: mesclarDataFim(left.dataFim, right.dataFim),
  };
}

// Vínculo em aberto vence qualquer data fechada: ele ainda pode se estender.
function mesclarDataFim(
  left: string | null,
  right: string | null,
): string | null {
  if (left === null || right === null) return null;
  return left >= right ? left : right;
}

function compareOrgaos(left: DeputadoOrgao, right: DeputadoOrgao): number {
  const groupDifference =
    getPresentationGroup(left.titulo) - getPresentationGroup(right.titulo);
  if (groupDifference !== 0) return groupDifference;

  const dateDifference = right.dataInicio.localeCompare(left.dataInicio);
  if (dateDifference !== 0) return dateDifference;

  const nameDifference = left.nome.localeCompare(right.nome, 'pt-BR');
  if (nameDifference !== 0) return nameDifference;

  return left.externalIdOrgao - right.externalIdOrgao;
}

function getPresentationGroup(titulo: string): number {
  const normalized = titulo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');

  if (normalized.includes('presidente')) return 0;
  if (normalized === 'titular') return 1;
  if (normalized === 'suplente') return 2;
  return 3;
}
