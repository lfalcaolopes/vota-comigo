import type {
  ComparativoCota,
  ComparativoDeputado,
  DeputadoOrgaosResponse,
  DeputadoPerfil,
  DeputadoProposicoesAssinadasResponse,
} from '@vota-comigo/shared-types';

type ComparativoDeputadoInput = {
  perfil: DeputadoPerfil;
  proposicoesAssinadas: DeputadoProposicoesAssinadasResponse | null;
  orgaos: DeputadoOrgaosResponse | null;
  cota: ComparativoCota | null;
};

export function toComparativoDeputado(
  input: ComparativoDeputadoInput,
): ComparativoDeputado {
  const { perfil } = input;

  return {
    externalIdDeputado: perfil.externalIdDeputado,
    nomePublico: perfil.nomePublico,
    nomeCivil: perfil.nomeCivil,
    fonteOficial: perfil.fonteOficial,
    emAtividade: perfil.emAtividade,
    snapshotPublicoDisponivel: perfil.snapshotPublicoDisponivel,
    snapshotPublico: perfil.snapshotPublico,
    legislaturaInicialPeriodo: perfil.legislaturaInicialPeriodo,
    legislaturaFinalPeriodo: perfil.legislaturaFinalPeriodo,
    resumoPresencaDisponivel: perfil.resumoPresencaDisponivel,
    resumoPresenca: perfil.resumoPresenca,
    proposicoesAssinadas: input.proposicoesAssinadas,
    orgaos: input.orgaos,
    cota: input.cota,
  };
}
