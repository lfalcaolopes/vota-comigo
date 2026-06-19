import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from '../rules/proposicao-resumo-ia-source';

function source(
  overrides: Partial<ProposicaoResumoIaSource> = {},
): ProposicaoResumoIaSource {
  return {
    externalIdProposicao: 42,
    siglaTipo: 'PL',
    numero: 1234,
    ano: 2024,
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Altera regra de transparência pública.',
    ementaDetalhada: 'Define critérios para publicar dados oficiais.',
    keywords: 'transparência, dados públicos',
    ...overrides,
  };
}

describe('calculateProposicaoResumoIaSourceHash', () => {
  describe('when text fields have equivalent whitespace', () => {
    it('keeps the same hash after trimming and collapsing whitespace', () => {
      // Arrange
      const normalized = source();
      const withExtraWhitespace = source({
        siglaTipo: '  PL  ',
        descricaoTipo: 'Projeto   de\tLei',
        ementa: '\nAltera regra   de transparência pública. ',
        ementaDetalhada: 'Define critérios\npara\tpublicar   dados oficiais.',
        keywords: ' transparência,\n dados\tpúblicos ',
      });

      // Act
      const normalizedHash = calculateProposicaoResumoIaSourceHash(normalized);
      const withExtraWhitespaceHash =
        calculateProposicaoResumoIaSourceHash(withExtraWhitespace);

      // Assert
      expect(withExtraWhitespaceHash).toBe(normalizedHash);
    });
  });

  describe('when substantive source fields change', () => {
    it.each([
      ['externalIdProposicao', { externalIdProposicao: 43 }],
      ['siglaTipo', { siglaTipo: 'PEC' }],
      ['numero', { numero: 1235 }],
      ['ano', { ano: 2025 }],
      ['descricaoTipo', { descricaoTipo: 'Proposta de Emenda à Constituição' }],
      ['ementa', { ementa: 'Altera regra de dados abertos.' }],
      [
        'ementaDetalhada',
        { ementaDetalhada: 'Amplia critérios para publicar dados oficiais.' },
      ],
      ['keywords', { keywords: 'dados abertos, transparência' }],
    ] satisfies [string, Partial<ProposicaoResumoIaSource>][])(
      'changes the hash when %s changes',
      (_field, overrides) => {
        // Arrange
        const original = source();
        const changed = source(overrides);

        // Act
        const originalHash = calculateProposicaoResumoIaSourceHash(original);
        const changedHash = calculateProposicaoResumoIaSourceHash(changed);

        // Assert
        expect(changedHash).not.toBe(originalHash);
      },
    );
  });

  describe('when non-substantive context fields change', () => {
    it('keeps the same hash for data outside the IA summary source', () => {
      // Arrange
      const firstFixture = {
        ...source(),
        temaOficial: 'Administração Pública',
        statusTramitacao: {
          siglaOrgao: 'CCJC',
          situacao: 'Aguardando parecer',
        },
        votacaoReferenciaMatcher: {
          externalIdVotacao: '2024-42-1',
          resultado: 'aprovada',
        },
      };
      const secondFixture = {
        ...source(),
        temaOficial: 'Direitos Humanos',
        statusTramitacao: {
          siglaOrgao: 'PLEN',
          situacao: 'Pronta para pauta',
        },
        votacaoReferenciaMatcher: {
          externalIdVotacao: '2024-42-2',
          resultado: 'rejeitada',
        },
      };

      // Act
      const firstHash = calculateProposicaoResumoIaSourceHash(firstFixture);
      const secondHash = calculateProposicaoResumoIaSourceHash(secondFixture);

      // Assert
      expect(secondHash).toBe(firstHash);
    });
  });
});
