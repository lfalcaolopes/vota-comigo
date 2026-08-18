import { isAnoReposto } from '../ano-reposto';

describe('ano reposto da cota', () => {
  describe('when the reposicao was apurada against the current dump coverage', () => {
    it('reads the year as reposto', () => {
      // Arrange
      const cobertura = {
        sigepaReposto: true,
        sigepaCoveredThroughMonth: 7,
        coveredThroughMonth: 7,
      };

      // Act
      const reposto = isAnoReposto(cobertura);

      // Assert
      expect(reposto).toBe(true);
    });
  });

  describe('when a later dump advances the coverage past the apurado month', () => {
    it('reads the year as nao reposto, because months nobody fetched appeared', () => {
      // Arrange
      const cobertura = {
        sigepaReposto: true,
        sigepaCoveredThroughMonth: 7,
        coveredThroughMonth: 9,
      };

      // Act
      const reposto = isAnoReposto(cobertura);

      // Assert
      expect(reposto).toBe(false);
    });
  });

  describe('when the year was never registered as reposto', () => {
    it('reads the year as nao reposto', () => {
      // Arrange
      const cobertura = {
        sigepaReposto: false,
        sigepaCoveredThroughMonth: null,
        coveredThroughMonth: 12,
      };

      // Act
      const reposto = isAnoReposto(cobertura);

      // Assert
      expect(reposto).toBe(false);
    });
  });

  describe('when the flag is set without the month it was apurado against', () => {
    it('reads the year as nao reposto, because there is nothing to compare', () => {
      // Arrange
      const cobertura = {
        sigepaReposto: true,
        sigepaCoveredThroughMonth: null,
        coveredThroughMonth: 12,
      };

      // Act
      const reposto = isAnoReposto(cobertura);

      // Assert
      expect(reposto).toBe(false);
    });
  });
});
