import type { DeputadoPerfil } from '@vota-comigo/shared-types';

import { isEmAtividade } from '@/exercicio/rules/intervalos-exercicio';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import { nomePublicoDeputado } from '@/shared/deputado/nome-publico';

import { deriveHistoricoPartidario } from '../rules/historico-partidario';
import { parseRedesSociais } from '../rules/redes-sociais';
import { deriveResumoPresenca } from '../rules/resumo-presenca';
import { deriveSnapshotPublico } from '../rules/snapshot-publico';
import type {
  DeputadoPerfilSource,
  VotacaoProposicaoComputavelRow,
} from '../types/deputados.types';
import { fonteOficialDeputado } from './camara-portal-url';

export function toDeputadoPerfil(
  source: DeputadoPerfilSource,
  votacoesProposicoesComputaveis: readonly VotacaoProposicaoComputavelRow[],
): DeputadoPerfil {
  const snapshot = deriveSnapshotPublico(source.eventos);

  const nomePublico = nomePublicoDeputado({
    nomeEleitoral: snapshot?.nomeEleitoral ?? null,
    nome: source.nome,
    nomeCivil: source.nomeCivil,
  });

  const eventosExercicio: readonly EventoExercicio[] = source.eventos.map(
    (e) => ({
      dataHora: e.dataHora,
      situacao: e.situacao,
      descricaoStatus: e.descricaoStatus,
      partido: e.siglaPartido,
    }),
  );

  const { resumoPresencaDisponivel, resumoPresenca } = deriveResumoPresenca({
    eventos: eventosExercicio,
    votacoes: votacoesProposicoesComputaveis.map((v) => ({
      votacao: { dataHoraRegistro: v.dataHoraRegistro, data: v.data },
      voto: v.voto,
    })),
  });

  const { historicoPartidarioDisponivel, historicoPartidario } =
    deriveHistoricoPartidario({ eventos: source.eventos, snapshot });

  return {
    externalIdDeputado: source.externalIdDeputado,
    nomePublico,
    nomeCivil: source.nomeCivil,
    fonteOficial: fonteOficialDeputado(source.externalIdDeputado),
    historicoParlamentarDisponivel: source.eventos.length > 0,
    snapshotPublicoDisponivel: snapshot !== null,
    snapshotPublico: snapshot,
    emAtividade: isEmAtividade(eventosExercicio),
    redesSociais: parseRedesSociais(source.urlRedeSocial),
    dataNascimento: source.dataNascimento,
    municipioNascimento: source.municipioNascimento,
    ufNascimento: source.ufNascimento,
    externalIdLegislaturaInicial: source.externalIdLegislaturaInicial,
    externalIdLegislaturaFinal: source.externalIdLegislaturaFinal,
    legislaturaInicialPeriodo: source.legislaturaInicialPeriodo,
    legislaturaFinalPeriodo: source.legislaturaFinalPeriodo,
    resumoPresencaDisponivel,
    resumoPresenca,
    historicoPartidarioDisponivel,
    historicoPartidario,
  };
}
