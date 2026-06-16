import { nomePublicoDeputado } from '../rules/nome-publico';

describe('nomePublicoDeputado', () => {
  describe('when the registered nome is present', () => {
    it('uses nome as the public name', () => {
      // Arrange
      const cadastro = {
        nome: 'Maria da Silva',
        nomeCivil: 'Maria Aparecida da Silva',
      };

      // Act
      const nome = nomePublicoDeputado(cadastro);

      // Assert
      expect(nome).toBe('Maria da Silva');
    });
  });

  describe('when nome is absent but nomeCivil is present', () => {
    it('falls back to nomeCivil', () => {
      // Arrange
      const cadastro = { nome: null, nomeCivil: 'Maria Aparecida da Silva' };

      // Act
      const nome = nomePublicoDeputado(cadastro);

      // Assert
      expect(nome).toBe('Maria Aparecida da Silva');
    });
  });

  describe('when neither nome nor nomeCivil is present', () => {
    it('returns null', () => {
      // Arrange
      const cadastro = { nome: null, nomeCivil: null };

      // Act
      const nome = nomePublicoDeputado(cadastro);

      // Assert
      expect(nome).toBeNull();
    });
  });
});
