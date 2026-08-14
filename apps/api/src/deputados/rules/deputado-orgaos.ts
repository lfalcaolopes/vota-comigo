import type { DeputadoOrgao } from '@vota-comigo/shared-types';

export function sortDeputadoOrgaos(
  items: readonly DeputadoOrgao[],
): readonly DeputadoOrgao[] {
  return [...items].sort(compareOrgaos);
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
