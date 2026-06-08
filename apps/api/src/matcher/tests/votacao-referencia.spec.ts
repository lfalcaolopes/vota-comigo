import {
  classifyVotacaoReferencia,
  interpretResultado,
  selectVotacaoReferencia,
} from '../rules/votacao-referencia';
import type { VotacaoCandidate } from '../rules/votacao-referencia';

function candidate(
  overrides: Partial<VotacaoCandidate> = {},
): VotacaoCandidate {
  return {
    externalIdVotacao: '0-1',
    data: '2024-01-01',
    dataHoraRegistro: '2024-01-01T12:00:00Z',
    descricao: null,
    ultimaAberturaVotacaoDescricao: null,
    ultimaApresentacaoProposicaoDescricao: null,
    votosSim: null,
    votosNao: null,
    votosOutros: null,
    aprovacao: null,
    ...overrides,
  };
}

describe('classifyVotacaoReferencia', () => {
  describe('when a vote is the merit decision of a projeto de lei', () => {
    it('classifies it as priority 5 with pattern projeto_de_lei', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovado o Projeto de Lei, ressalvados os destaques',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({
        priority: 5,
        pattern: 'projeto_de_lei',
      });
    });
  });

  describe('when the merit description has accents and mixed case', () => {
    it('normalizes before matching (medida provisoria)', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovada a Medida Provisória nº 1300, de 2025',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({
        priority: 5,
        pattern: 'medida_provisoria',
      });
    });
  });

  describe.each([
    ['o substitutivo', 'substitutivo_ou_subemenda_substitutiva'],
    ['a subemenda substitutiva', 'substitutivo_ou_subemenda_substitutiva'],
    ['o projeto de decreto legislativo', 'projeto_decreto_legislativo'],
    ['o projeto de resolucao', 'projeto_resolucao'],
  ])('when the merit decision is "%s"', (trecho, pattern) => {
    it(`classifies it as priority 5 with pattern ${pattern}`, () => {
      // Arrange
      const votacao = candidate({ descricao: `Aprovado ${trecho}` });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({ priority: 5, pattern });
    });
  });

  describe('when the description is procedural even if it mentions merit', () => {
    it('discards requerimento/recurso/dispensa/preferencia (returns null)', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Requerimento de retirada de pauta do Projeto de Lei',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toBeNull();
    });
  });

  describe('when a PEC is voted in second turn', () => {
    it('classifies it as priority 6 using the cascade text for the turno', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovada a Proposta de Emenda à Constituição',
        ultimaAberturaVotacaoDescricao: 'Votação em segundo turno',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({
        priority: 6,
        pattern: 'pec_segundo_turno',
      });
    });
  });

  describe('when a PEC has no explicit turno in the cascade', () => {
    it('classifies it as generic PEC priority 5', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovada a Proposta de Emenda à Constituição',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({ priority: 5, pattern: 'pec_generica' });
    });
  });

  describe('when a PEC mentions first turn in the cascade', () => {
    it('still resolves to generic PEC priority 5 (generic arm precedes first-turn arm)', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovada a Proposta de Emenda à Constituição',
        ultimaAberturaVotacaoDescricao: 'Votação em primeiro turno',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({ priority: 5, pattern: 'pec_generica' });
    });
  });

  describe('when the vote decides emendas do Senado Federal', () => {
    it('classifies it as priority 4', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovadas as Emendas do Senado Federal ao Projeto',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({
        priority: 4,
        pattern: 'emendas_senado_federal',
      });
    });
  });

  describe('when no merit pattern matches but the cascade has a turno signal', () => {
    it('falls back to recall por turno (priority 2)', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovada a matéria',
        ultimaAberturaVotacaoDescricao: 'Votação em turno único',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({
        priority: 2,
        pattern: 'recall_turno_cascata',
      });
    });
  });

  describe('when the recall candidate is a destaque/DTQ', () => {
    it('discards it (returns null)', () => {
      // Arrange
      const votacao = candidate({
        descricao: 'Aprovado o Destaque ao texto',
        ultimaAberturaVotacaoDescricao: 'Votação em turno único',
      });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toBeNull();
    });
  });

  describe('when the only signal is redação final', () => {
    it('classifies it as the weak fallback priority 1', () => {
      // Arrange
      const votacao = candidate({ descricao: 'Redação Final do Projeto' });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toEqual({ priority: 1, pattern: 'redacao_final' });
    });
  });

  describe('when nothing matches', () => {
    it('returns null', () => {
      // Arrange
      const votacao = candidate({ descricao: 'Votação simbólica do parecer' });

      // Act
      const classification = classifyVotacaoReferencia(votacao);

      // Assert
      expect(classification).toBeNull();
    });
  });
});

describe('selectVotacaoReferencia', () => {
  describe('when candidates have different priorities', () => {
    it('picks the highest priority candidate', () => {
      // Arrange
      const lei = candidate({
        externalIdVotacao: 'lei',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const pecSegundoTurno = candidate({
        externalIdVotacao: 'pec',
        descricao: 'Aprovada a Proposta de Emenda à Constituição',
        ultimaAberturaVotacaoDescricao: 'Votação em segundo turno',
      });

      // Act
      const referencia = selectVotacaoReferencia([lei, pecSegundoTurno]);

      // Assert
      expect(referencia?.externalIdVotacao).toBe('pec');
      expect(referencia?.classification.priority).toBe(6);
    });
  });

  describe('when priorities tie', () => {
    it('prefers the most recent dataHoraRegistro, with nulls last', () => {
      // Arrange
      const semData = candidate({
        externalIdVotacao: 'sem-data',
        descricao: 'Aprovado o Projeto de Lei',
        dataHoraRegistro: null,
      });
      const recente = candidate({
        externalIdVotacao: 'recente',
        descricao: 'Aprovado o Projeto de Lei',
        dataHoraRegistro: '2024-05-10T10:00:00Z',
      });

      // Act
      const referencia = selectVotacaoReferencia([semData, recente]);

      // Assert
      expect(referencia?.externalIdVotacao).toBe('recente');
    });

    it('breaks remaining ties by totalVotos then externalIdVotacao desc', () => {
      // Arrange
      const data = '2024-05-10T10:00:00Z';
      const menosVotos = candidate({
        externalIdVotacao: 'aaa',
        descricao: 'Aprovado o Projeto de Lei',
        dataHoraRegistro: data,
        votosSim: 10,
        votosNao: 1,
        votosOutros: 0,
      });
      const maisVotos = candidate({
        externalIdVotacao: 'bbb',
        descricao: 'Aprovado o Projeto de Lei',
        dataHoraRegistro: data,
        votosSim: 300,
        votosNao: 100,
        votosOutros: 5,
      });

      // Act
      const referencia = selectVotacaoReferencia([menosVotos, maisVotos]);

      // Assert
      expect(referencia?.externalIdVotacao).toBe('bbb');
      expect(referencia?.totalVotos).toBe(405);
    });
  });

  describe('when no candidate is classifiable', () => {
    it('returns null', () => {
      // Arrange
      const requerimento = candidate({ descricao: 'Requerimento de urgência' });
      const simbolica = candidate({ descricao: 'Votação simbólica' });

      // Act
      const referencia = selectVotacaoReferencia([requerimento, simbolica]);

      // Assert
      expect(referencia).toBeNull();
    });
  });
});

describe('interpretResultado', () => {
  it.each([
    [1, 'aprovada'],
    [0, 'rejeitada'],
    [null, 'indisponivel'],
    [2, 'indisponivel'],
  ])('maps aprovacao %p to %p', (aprovacao, esperado) => {
    // Act
    const resultado = interpretResultado(aprovacao);

    // Assert
    expect(resultado).toBe(esperado);
  });
});
