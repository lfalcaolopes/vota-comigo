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
  { name: 'deputado_gasto_cota', scope: 'annual', dataset: 'ceap' },
  { name: 'proposicoes', scope: 'single', source: 'derived' },
  { name: 'votacao_proposicao', scope: 'single', source: 'derived' },
  { name: 'proposicao_computavel', scope: 'single', source: 'derived' },
  { name: 'tema', scope: 'single', source: 'derived' },
  { name: 'deputado_historico', scope: 'single', source: 'api', manual: true },
  { name: 'deputado_presenca', scope: 'single', source: 'derived' },
  {
    name: 'deputado_exercicio_intervalo',
    scope: 'single',
    source: 'derived',
  },
  // Depois dos intervalos: a mediana só considera quem exerceu o ano inteiro.
  { name: 'cota_mediana_uf', scope: 'single', source: 'derived' },
  { name: 'sanity', scope: 'single', source: 'db' },
];
