import type { IngestionStepDescriptor } from '../types/ingestion-pipeline-runner.types';

export const ingestionStepDescriptors: readonly IngestionStepDescriptor[] = [
  { name: 'legislaturas', scope: 'single' },
  { name: 'deputados', scope: 'single' },
  { name: 'orgaos', scope: 'single' },
  { name: 'deputado_orgao', scope: 'single', source: 'derived' },
  {
    name: 'deputado_proposicao_assinada',
    scope: 'single',
    source: 'derived',
  },
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
  // Depois de proposicao_computavel e do import dos resumos (CLI fora do
  // runner): o texto embedado inclui o resumo aprovado.
  { name: 'proposicao_embedding', scope: 'single', source: 'derived' },
  { name: 'deputado_historico', scope: 'single', source: 'api', manual: true },
  { name: 'deputado_presenca', scope: 'single', source: 'derived' },
  {
    name: 'deputado_exercicio_intervalo',
    scope: 'single',
    source: 'derived',
  },
  // Depois dos intervalos: os elegíveis do ano saem do exercício, não do dump.
  {
    name: 'deputado_gasto_cota_sigepa',
    scope: 'annual',
    source: 'api',
    manual: true,
  },
  // Depois dos intervalos: a mediana só considera quem exerceu o ano inteiro.
  { name: 'cota_mediana_uf', scope: 'single', source: 'derived' },
  // Depois da mediana: é ela o denominador da comparação de cada deputado.
  { name: 'deputado_cota_comparacao', scope: 'single', source: 'derived' },
  { name: 'sanity', scope: 'single', source: 'db' },
];
