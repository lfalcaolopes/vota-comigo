export type EscopoVotacao = 'plenario' | 'comissao';

const PLENARY_ORGAOS = new Set(['PLEN', 'CN']);

export function deriveEscopoVotacao(siglaOrgao: string | null): EscopoVotacao {
  if (siglaOrgao !== null && PLENARY_ORGAOS.has(siglaOrgao)) {
    return 'plenario';
  }

  return 'comissao';
}

export function isPlenario(siglaOrgao: string | null | undefined): boolean {
  return deriveEscopoVotacao(siglaOrgao ?? null) === 'plenario';
}
