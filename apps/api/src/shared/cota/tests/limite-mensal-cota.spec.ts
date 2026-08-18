import { limiteMensalCota, vigenciasLimiteCota } from '../limite-mensal-cota';

describe('limite mensal da cota parlamentar', () => {
  describe('quando a data cai dentro de uma vigencia', () => {
    it('retorna o teto da UF em centavos', () => {
      // Arrange
      const data = '2024-06-15';

      // Act
      const limite = limiteMensalCota('SP', data);

      // Assert
      expect(limite).toBe(4283733);
    });

    it('distingue UFs com tetos diferentes na mesma data', () => {
      // Arrange
      const data = '2024-06-15';

      // Act
      const menor = limiteMensalCota('DF', data);
      const maior = limiteMensalCota('RR', data);

      // Assert
      expect(menor).toBe(3658246);
      expect(maior).toBe(5140633);
    });
  });

  describe('quando a tabela vira no meio do mes', () => {
    it('mantem o teto antigo na vespera da nova vigencia', () => {
      // Arrange
      const vespera = '2026-02-19';

      // Act
      const limite = limiteMensalCota('DF', vespera);

      // Assert
      expect(limite).toBe(3658246);
    });

    it('aplica o teto novo a partir do dia em que o ato entra em vigor', () => {
      // Arrange
      const estreia = '2026-02-20';

      // Act
      const limite = limiteMensalCota('DF', estreia);

      // Assert
      expect(limite).toBe(4161255);
    });

    it('cobre a vigencia de um unico mes de fevereiro de 2016', () => {
      // Arrange
      const dentro = '2016-02-10';
      const depois = '2016-03-01';

      // Act
      const limiteDentro = limiteMensalCota('DF', dentro);
      const limiteDepois = limiteMensalCota('DF', depois);

      // Assert
      expect(limiteDentro).toBe(3049066);
      expect(limiteDepois).toBe(3078866);
    });
  });

  describe('quando o inicio da serie de gastos usa a tabela anterior', () => {
    it('aplica a tabela de 2013 ao primeiro trimestre de 2015', () => {
      // Arrange
      const janeiro = '2015-01-31';
      const abril = '2015-04-01';

      // Act
      const limiteJaneiro = limiteMensalCota('SP', janeiro);
      const limiteAbril = limiteMensalCota('SP', abril);

      // Assert
      expect(limiteJaneiro).toBe(3373095);
      expect(limiteAbril).toBe(3667167);
    });
  });

  describe('quando nao ha teto conhecido', () => {
    it('retorna null para data anterior a primeira vigencia', () => {
      // Arrange
      const data = '2013-12-31';

      // Act
      const limite = limiteMensalCota('SP', data);

      // Assert
      expect(limite).toBeNull();
    });

    it('retorna null para UF fora da tabela', () => {
      // Arrange
      const data = '2024-06-15';

      // Act
      const limite = limiteMensalCota('XX', data);

      // Assert
      expect(limite).toBeNull();
    });
  });

  describe('cobertura da tabela', () => {
    it('descreve as 27 unidades da federacao em toda vigencia', () => {
      // Arrange
      const vigencias = vigenciasLimiteCota;

      // Act
      const contagens = vigencias.map(
        (vigencia) => Object.keys(vigencia.limitePorUf).length,
      );

      // Assert
      expect(contagens).toEqual([27, 27, 27, 27, 27, 27]);
    });

    it('encadeia as vigencias sem buraco entre elas', () => {
      // Arrange
      const vigencias = vigenciasLimiteCota;

      // Act
      const buracos = vigencias.slice(0, -1).filter((vigencia, indice) => {
        const proximoInicio = new Date(vigencias[indice + 1].inicio);
        const diaSeguinte = new Date(`${vigencia.fim}T00:00:00Z`);
        diaSeguinte.setUTCDate(diaSeguinte.getUTCDate() + 1);
        return diaSeguinte.getTime() !== proximoInicio.getTime();
      });

      // Assert
      expect(buracos).toEqual([]);
    });

    it('deixa apenas a ultima vigencia em aberto', () => {
      // Arrange
      const vigencias = vigenciasLimiteCota;

      // Act
      const emAberto = vigencias.filter((vigencia) => vigencia.fim === null);

      // Assert
      expect(emAberto).toHaveLength(1);
      expect(emAberto[0]).toBe(vigencias[vigencias.length - 1]);
    });
  });
});
