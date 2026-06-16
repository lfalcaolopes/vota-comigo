import type {
  EscopoMatcher,
  MatcherExecucaoResumo,
} from '@vota-comigo/shared-types';

import { toMatcherResultado } from '../mappers/compatibilidade-resumida.mapper';
import type { DeputadoResumoComputado } from '../types/compatibilidade.types';

const resumo: MatcherExecucaoResumo = {
  siglaUf: 'PE',
  cidade: null,
  totalProposicoesSelecionadas: 3,
  totalPosicoesComputaveis: 3,
};

const escopo: EscopoMatcher = 'estadual';

const paginacao = { limit: 20, offset: 0, total: 1 };

function deputado(
  overrides: Partial<DeputadoResumoComputado> = {},
): DeputadoResumoComputado {
  return {
    externalIdDeputado: 100,
    nome: 'Maria Nome Cadastro',
    nomeEleitoral: 'Maria da Silva',
    nomeCivil: 'Maria Aparecida da Silva',
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: 'https://foto/dep.jpg',
    compatibilidadeBruta: 100,
    amostraComparavel: 3,
    scoreOrdenacaoPercentual: 60,
    alertas: [],
    emAtividade: true,
    coberturaExercicio: 3,
    ...overrides,
  };
}

function mapNome(dep: DeputadoResumoComputado): string | null {
  const resultado = toMatcherResultado(
    resumo,
    escopo,
    { totalDeputadosAvaliados: 1, deputadosHistoricoIncompleto: 0 },
    [dep],
    paginacao,
    false,
  );
  return resultado.deputados[0]?.nome ?? null;
}

describe('toMatcherResultado', () => {
  describe('when deriving the public name of a deputado', () => {
    it('uses nomeEleitoral as the public name when present', () => {
      // Act
      const nome = mapNome(deputado());

      // Assert
      expect(nome).toBe('Maria da Silva');
    });

    it('falls back to nome when nomeEleitoral is absent', () => {
      // Act
      const nome = mapNome(deputado({ nomeEleitoral: null }));

      // Assert
      expect(nome).toBe('Maria Nome Cadastro');
    });

    it('falls back to nomeCivil when nomeEleitoral and nome are absent', () => {
      // Act
      const nome = mapNome(deputado({ nomeEleitoral: null, nome: null }));

      // Assert
      expect(nome).toBe('Maria Aparecida da Silva');
    });

    it('keeps the urlFoto from the most recent snapshot', () => {
      // Act
      const resultado = toMatcherResultado(
        resumo,
        escopo,
        { totalDeputadosAvaliados: 1, deputadosHistoricoIncompleto: 0 },
        [deputado({ urlFoto: 'https://foto/recente.jpg' })],
        paginacao,
        false,
      );

      // Assert
      expect(resultado.deputados[0]?.urlFoto).toBe('https://foto/recente.jpg');
    });
  });
});
