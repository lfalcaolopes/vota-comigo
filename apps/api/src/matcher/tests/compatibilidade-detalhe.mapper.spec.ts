import type { MatcherExecucaoResumo } from '@vota-comigo/shared-types';

import { toMatcherDeputadoDetalhe } from '../mappers/compatibilidade-detalhe.mapper';
import type { DeputadoDetalheComputado } from '../types/compatibilidade.types';

const resumo: MatcherExecucaoResumo = {
  siglaUf: 'PE',
  cidade: null,
  totalProposicoesSelecionadas: 3,
  totalPosicoesComputaveis: 3,
};

function detalhe(
  overrides: Partial<DeputadoDetalheComputado> = {},
): DeputadoDetalheComputado {
  return {
    externalIdDeputado: 100,
    nome: 'Maria Nome Cadastro',
    nomeEleitoral: 'Maria da Silva',
    nomeCivil: 'Maria Aparecida da Silva',
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: 'https://foto/dep.jpg',
    emAtividade: true,
    metrics: {
      totalConcordancias: 3,
      totalDiscordancias: 0,
      totalForaDoDenominador: 0,
      amostraComparavel: 3,
      coberturaExercicio: 3,
      compatibilidadeBruta: 100,
      scoreOrdenacaoPercentual: 60,
      alertas: [],
    },
    votos: [],
    ...overrides,
  };
}

function mapNome(input: DeputadoDetalheComputado): string | null {
  return toMatcherDeputadoDetalhe(resumo, input).deputado.nome;
}

describe('toMatcherDeputadoDetalhe', () => {
  describe('when deriving the public name of a deputado', () => {
    it('uses nomeEleitoral as the public name when present', () => {
      // Act / Assert
      expect(mapNome(detalhe())).toBe('Maria da Silva');
    });

    it('falls back to nome when nomeEleitoral is absent', () => {
      // Act / Assert
      expect(mapNome(detalhe({ nomeEleitoral: null }))).toBe(
        'Maria Nome Cadastro',
      );
    });

    it('falls back to nomeCivil when nomeEleitoral and nome are absent', () => {
      // Act / Assert
      expect(mapNome(detalhe({ nomeEleitoral: null, nome: null }))).toBe(
        'Maria Aparecida da Silva',
      );
    });

    it('keeps the urlFoto from the most recent snapshot', () => {
      // Act
      const result = toMatcherDeputadoDetalhe(
        resumo,
        detalhe({ urlFoto: 'https://foto/recente.jpg' }),
      );

      // Assert
      expect(result.deputado.urlFoto).toBe('https://foto/recente.jpg');
    });
  });
});
