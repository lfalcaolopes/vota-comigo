import type {
  ComparativoCota,
  ComparativoDeputado,
  ComparativoJanela,
  ComparativoOrgaos,
  ComparativoProposicoesAssinadas,
  DeputadoPerfil,
} from '@vota-comigo/shared-types';

type ComparativoDeputadoInput = {
  perfil: DeputadoPerfil;
  janela: ComparativoJanela;
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
    resumoPresencaDisponivel: perfil.resumoPresencaDisponivel,
    resumoPresenca: perfil.resumoPresenca,
    proposicoesAssinadas: input.proposicoesAssinadas,
    orgaos: input.orgaos,
    cota: input.cota,
  };
}
