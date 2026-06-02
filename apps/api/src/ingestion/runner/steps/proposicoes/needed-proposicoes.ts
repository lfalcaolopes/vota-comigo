import type { CsvRowSource } from '../../ingestion-runner.types';
import { normalizeVotacaoVotoRecord } from '../../shared/votacoes-votos.normalizer';
import { normalizeVotacaoProposicaoRecord } from '../../shared/votacoes-proposicoes.normalizer';

export type NeededProposicoesInput = {
  years: readonly number[];
  limit?: number;
  readDataset: (dataset: string, year: number) => CsvRowSource | undefined;
};

export type NeededProposicoes = {
  // Proposição ids agrupados pelo ano cujo `proposicoes-{ano}.csv` os contém.
  neededByYear: Map<number, Set<number>>;
};

/**
 * Única fonte de verdade do "conjunto necessário": deriva, das votações nominais
 * em escopo (respeitando `--from`/`--to`/`--limit`), as proposições afetadas e o
 * ano de cada uma. Alimenta tanto a validação/download quanto a ingestão, para
 * que não divirjam.
 */
export async function collectNeededProposicoes(
  input: NeededProposicoesInput,
): Promise<NeededProposicoes> {
  const nominalIds = await collectNominalIds(input);
  const neededByYear = new Map<number, Set<number>>();

  for (const year of input.years) {
    const links = input.readDataset('votacoesProposicoes', year);

    if (links === undefined) {
      continue;
    }

    for await (const { record } of links()) {
      const { idVotacao, proposicaoId, proposicaoAno } =
        normalizeVotacaoProposicaoRecord(record);

      if (idVotacao === null || !nominalIds.has(idVotacao)) {
        continue;
      }

      if (proposicaoId === null || proposicaoAno === null) {
        continue;
      }

      const ids = neededByYear.get(proposicaoAno) ?? new Set<number>();
      ids.add(proposicaoId);
      neededByYear.set(proposicaoAno, ids);
    }
  }

  return { neededByYear };
}

async function collectNominalIds(
  input: NeededProposicoesInput,
): Promise<Set<string>> {
  const ids = new Set<string>();

  for (const year of input.years) {
    const votos = input.readDataset('votacoesVotos', year);

    if (votos === undefined) {
      continue;
    }

    for await (const { record } of votos()) {
      const { idVotacao } = normalizeVotacaoVotoRecord(record);

      if (idVotacao === null) {
        continue;
      }

      if (
        input.limit !== undefined &&
        !ids.has(idVotacao) &&
        ids.size >= input.limit
      ) {
        return ids;
      }

      ids.add(idVotacao);
    }
  }

  return ids;
}
