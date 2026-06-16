import { nomePublicoDeputado } from '../rules/nome-publico';

describe('nomePublicoDeputado', () => {
  describe('when nomeEleitoral is present', () => {
    it('uses nomeEleitoral as the public name', () => {
      // Arrange
      const input = {
        nomeEleitoral: 'Maria da Silva',
        nome: 'Maria Nome Cadastro',
        nomeCivil: 'Maria Aparecida da Silva',
      };

      // Act
      const nome = nomePublicoDeputado(input);

      // Assert
      expect(nome).toBe('Maria da Silva');
    });
  });

  describe('when nomeEleitoral is absent but nome is present', () => {
    it('falls back to nome', () => {
      // Arrange
      const input = {
        nomeEleitoral: null,
        nome: 'Maria Nome Cadastro',
        nomeCivil: 'Maria Aparecida da Silva',
      };

      // Act
      const nome = nomePublicoDeputado(input);

      // Assert
      expect(nome).toBe('Maria Nome Cadastro');
    });
  });

  describe('when nomeEleitoral and nome are absent but nomeCivil is present', () => {
    it('falls back to nomeCivil', () => {
      // Arrange
      const input = {
        nomeEleitoral: null,
        nome: null,
        nomeCivil: 'Maria Aparecida da Silva',
      };

      // Act
      const nome = nomePublicoDeputado(input);

      // Assert
      expect(nome).toBe('Maria Aparecida da Silva');
    });
  });

  describe('when none of the name fields are present', () => {
    it('returns null', () => {
      // Arrange
      const input = { nomeEleitoral: null, nome: null, nomeCivil: null };

      // Act
      const nome = nomePublicoDeputado(input);

      // Assert
      expect(nome).toBeNull();
    });
  });
});
