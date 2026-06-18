import type { IngestionStepDescriptor } from '../types/ingestion-pipeline-runner.types';

export const ingestionStepDescriptors: readonly IngestionStepDescriptor[] = [
  { name: 'legislaturas', scope: 'single' },
  { name: 'deputados', scope: 'single' },
  { name: 'partidos', scope: 'annual', dataset: 'votacoesVotos' },
  {
    name: 'votacoes',
    scope: 'annual',
    companionDatasets: ['votacoesVotos'],
  },
  { name: 'votacao_votos', scope: 'annual', dataset: 'votacoesVotos' },
  { name: 'proposicoes', scope: 'single', source: 'derived' },
  { name: 'votacao_proposicao', scope: 'single', source: 'derived' },
  { name: 'proposicao_computavel', scope: 'single', source: 'derived' },
  { name: 'tema', scope: 'single', source: 'derived' },
  { name: 'deputado_historico', scope: 'single', source: 'api', manual: true },
  { name: 'sanity', scope: 'single', source: 'db' },
];
