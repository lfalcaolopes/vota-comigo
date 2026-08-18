import type {
  ComparativoCota,
  ComparativoDeputado,
  ComparativoJanela,
  ComparativoOrgaos,
  ComparativoProposicoesAssinadas,
  DeputadoPerfil,
  DeputadoResumoPresenca,
} from '@vota-comigo/shared-types';

type ComparativoDeputadoInput = {
  perfil: DeputadoPerfil;
  janela: ComparativoJanela;
  resumoPresenca: DeputadoResumoPresenca | null;
  proposicoesAssinadas: ComparativoProposicoesAssinadas | null;
  orgaos: ComparativoOrgaos | null;
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
    janela: input.janela,
    resumoPresencaDisponivel: input.resumoPresenca !== null,
    resumoPresenca: input.resumoPresenca,
    proposicoesAssinadas: input.proposicoesAssinadas,
    orgaos: input.orgaos,
    cota: input.cota,
  };
}
