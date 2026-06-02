import { toProposicaoRow } from './proposicoes.transformer';
import type { CsvRecord } from '../../csv-reader';

function record(overrides: CsvRecord = {}): CsvRecord {
  return {
    id: '253500',
    uri: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/253500',
    siglaTipo: 'PL',
    numero: '2597',
    ano: '2024',
    codTipo: '139',
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Estabelece normas gerais em contratos de seguro privado.',
    ementaDetalhada: 'Revoga dispositivos das Leis.',
    keywords: 'Normas, seguro privado.',
    dataApresentacao: '2024-05-21T17:30:00',
    urlInteiroTeor: 'https://www.camara.leg.br/proposicoesWeb/prop.pdf',
    ultimoStatus_dataHora: '2024-06-01T10:00:00',
    ultimoStatus_siglaOrgao: 'CCJC',
    ultimoStatus_regime: 'Urgencia',
    ultimoStatus_descricaoSituacao: 'Aguardando Parecer',
    ...overrides,
  };
}

describe('proposicoes transformer', () => {
  describe('when mapping a complete proposicao row', () => {
    it('persists the fields needed for feed and relevance, parsing numbers', () => {
      // Arrange
      const csv = record();

      // Act
      const row = toProposicaoRow(csv);

      // Assert
      expect(row).toEqual({
        externalIdProposicao: 253500,
        uri: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/253500',
        siglaTipo: 'PL',
        numero: 2597,
        ano: 2024,
        externalCodTipo: 139,
        descricaoTipo: 'Projeto de Lei',
        ementa: 'Estabelece normas gerais em contratos de seguro privado.',
        ementaDetalhada: 'Revoga dispositivos das Leis.',
        keywords: 'Normas, seguro privado.',
        dataApresentacao: '2024-05-21T17:30:00',
        urlInteiroTeor: 'https://www.camara.leg.br/proposicoesWeb/prop.pdf',
        ultimoStatusDataHora: '2024-06-01T10:00:00',
        ultimoStatusSiglaOrgao: 'CCJC',
        ultimoStatusRegime: 'Urgencia',
        ultimoStatusDescricaoSituacao: 'Aguardando Parecer',
      });
    });
  });

  describe('when optional fields are blank', () => {
    it('maps empty strings to null and leaves the external id intact', () => {
      // Arrange
      const csv = record({
        numero: '',
        codTipo: '',
        keywords: '',
        urlInteiroTeor: '',
        ultimoStatus_regime: '',
        ultimoStatus_descricaoSituacao: '',
      });

      // Act
      const row = toProposicaoRow(csv);

      // Assert
      expect(row).toMatchObject({
        externalIdProposicao: 253500,
        numero: null,
        externalCodTipo: null,
        keywords: null,
        urlInteiroTeor: null,
        ultimoStatusRegime: null,
        ultimoStatusDescricaoSituacao: null,
      });
    });
  });
});
