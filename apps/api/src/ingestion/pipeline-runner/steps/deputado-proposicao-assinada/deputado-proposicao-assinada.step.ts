import { StrictModeError } from '../../errors/strict-mode-error';
import { createProgressLogger, stepLabel } from '../../reporting/step-logging';
import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';

import { deriveAnosPublicaveis } from './anos-publicaveis';
import {
  applyProposicoesAno,
  collectAssinaturasDoAno,
  toDeputadoProposicaoAssinadaRows,
  toProposicaoTipoRows,
  type AssinaturaBuckets,
  type PorProposicao,
  type TipoRegistry,
} from './proposicao-assinada.transformer';
import type { DeputadoProposicaoAssinadaRepository } from './deputado-proposicao-assinada.repository.types';

const STEP_NAME = 'deputado_proposicao_assinada';
// Piso do downloader (ADR 003 não se aplica ao alcance de datasets, mas nada
// foi baixado antes disso); o teto é sempre o ano corrente + 1 no momento da
// varredura, para cobrir apresentações já registradas para o ano seguinte.
const SWEEP_FLOOR_YEAR = 2001;

function emptyResult(): StepRunResult {
  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
  };
}

function fonteAusenteGap(dataset: string, year: number): ExternalGap {
  const file = `${dataset}-${year}.csv`;
  return {
    file,
    type: 'fonte_ausente',
    reference: String(year),
    message: `${file} ausente em disco; proposições assinadas de ${year} não foram calculadas a partir dessa fonte.`,
  };
}

export function createDeputadoProposicaoAssinadaStep(
  repository: DeputadoProposicaoAssinadaRepository,
): IngestionStep {
  return {
    name: STEP_NAME,
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const deputadoIds = await repository.loadDeputadoIdByExternalId();

      // Sem deputados carregados, nada é resolvível: gravar apagaria uma
      // carga boa por conta de um passo `deputados` ainda não executado.
      if (deputadoIds.size === 0) {
        context.reporter?.log(
          `[${STEP_NAME}] tabela deputado vazia, proposições assinadas não calculadas`,
        );
        return emptyResult();
      }

      const years = context.years ?? [];
      const readDataset = context.readDataset!;

      let read = 0;
      let ignored = 0;
      const rejected: StepRunResult['rejected'] = [];
      const externalGaps: ExternalGap[] = [];

      const pendentesGlobal: PorProposicao = new Map();
      const buckets: AssinaturaBuckets = new Map();
      const tipos: TipoRegistry = new Map();
      const anosLidosNaPassagemB = new Set<number>();

      const progress = createProgressLogger(
        context.reporter,
        stepLabel(STEP_NAME),
      );

      for (const year of years) {
        const sourceAutores = readDataset('proposicoesAutores', year);

        if (sourceAutores === undefined) {
          const gap = fonteAusenteGap('proposicoesAutores', year);
          if (context.strict) {
            throw StrictModeError.fromGap(gap);
          }
          externalGaps.push(gap);
          continue;
        }

        const passagemA = await collectAssinaturasDoAno({
          rows: sourceAutores(),
          deputadoIds,
        });
        read += passagemA.read;
        ignored += passagemA.ignored;
        progress.tick(read);

        const sourceProposicoes = readDataset('proposicoes', year);

        if (sourceProposicoes === undefined) {
          const gap = fonteAusenteGap('proposicoes', year);
          if (context.strict) {
            throw StrictModeError.fromGap(gap);
          }
          externalGaps.push(gap);

          for (const [id, assinantes] of passagemA.porProposicao) {
            pendentesGlobal.set(id, assinantes);
          }
          continue;
        }

        anosLidosNaPassagemB.add(year);

        const passagemB = await applyProposicoesAno({
          rows: sourceProposicoes(),
          sourceFile: `proposicoes-${year}.csv`,
          pendentes: passagemA.porProposicao,
          buckets,
          tipos,
        });
        read += passagemB.read;
        ignored += passagemB.ignoredTipoExcluido;
        progress.tick(read);

        for (const rejection of passagemB.rejected) {
          if (context.strict) {
            throw new StrictModeError(rejection);
          }
          rejected.push(rejection);
        }

        for (const [id, assinantes] of passagemA.porProposicao) {
          pendentesGlobal.set(id, assinantes);
        }
      }

      progress.done(read);

      // Resolução tardia: renumeração faz um idProposicao de um ano em escopo
      // aparecer só no proposicoes-{ano}.csv de outro ano.
      const sweepCeilingYear = new Date().getFullYear() + 1;
      for (
        let year = sweepCeilingYear;
        year >= SWEEP_FLOOR_YEAR && pendentesGlobal.size > 0;
        year -= 1
      ) {
        if (anosLidosNaPassagemB.has(year)) {
          continue;
        }

        const source = readDataset('proposicoes', year);

        if (source === undefined) {
          continue;
        }

        const late = await applyProposicoesAno({
          rows: source(),
          sourceFile: `proposicoes-${year}.csv`,
          pendentes: pendentesGlobal,
          buckets,
          tipos,
        });
        read += late.read;
        ignored += late.ignoredTipoExcluido;

        for (const rejection of late.rejected) {
          if (context.strict) {
            throw new StrictModeError(rejection);
          }
          rejected.push(rejection);
        }
      }

      for (const idProposicao of pendentesGlobal.keys()) {
        const gap: ExternalGap = {
          file: 'proposicoesAutores',
          type: 'proposicao_ausente',
          reference: String(idProposicao),
          message: `Proposição ${idProposicao} assinada por deputado não foi encontrada em nenhum proposicoes-{ano}.csv em disco.`,
        };
        if (context.strict) {
          throw StrictModeError.fromGap(gap);
        }
        externalGaps.push(gap);
      }

      if (buckets.size === 0) {
        const gap: ExternalGap = {
          file: STEP_NAME,
          type: 'fonte_vazia',
          reference: '*',
          message: `Nenhuma proposição assinada utilizável na varredura; a carga anterior de ${STEP_NAME} foi preservada.`,
        };
        externalGaps.push(gap);
        return {
          read,
          inserted: 0,
          updated: 0,
          ignored,
          rejected,
          externalGaps,
        };
      }

      const anosEmDisco: number[] = [];
      for (let year = SWEEP_FLOOR_YEAR; year <= sweepCeilingYear; year += 1) {
        if (readDataset('proposicoesAutores', year) !== undefined) {
          anosEmDisco.push(year);
        }
      }

      const publicaveis = deriveAnosPublicaveis({
        anosEmDisco,
        yearsEmEscopo: years,
      });

      let inserted = 0;

      if (!context.dryRun) {
        await repository.upsertTipos(toProposicaoTipoRows(tipos));
      }

      for (const [bucketYear, porDeputado] of buckets) {
        if (!publicaveis.isPublicavel(bucketYear)) {
          externalGaps.push({
            file: STEP_NAME,
            type: 'ano_fora_do_escopo',
            reference: String(bucketYear),
            message: `Balde de ${bucketYear} descartado: a vizinhança de anos não está inteiramente no escopo desta execução.`,
          });
          continue;
        }

        const rows = toDeputadoProposicaoAssinadaRows(bucketYear, porDeputado);

        if (context.dryRun) {
          continue;
        }

        const replaced = await repository.replaceAno(bucketYear, rows);
        inserted += replaced.inserted;
      }

      return { read, inserted, updated: 0, ignored, rejected, externalGaps };
    },
  };
}
