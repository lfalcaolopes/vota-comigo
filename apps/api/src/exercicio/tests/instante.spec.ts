import { toEpochMillis, toIsoUtc } from '../rules/instante';

describe('toEpochMillis', () => {
  describe('when the value comes from a Postgres timestamptz column', () => {
    it('parses the space-separated format with a two-digit offset', () => {
      // Arrange
      const timestamptz = '2007-02-05 14:55:00+00';

      // Act
      const epoch = toEpochMillis(timestamptz);

      // Assert
      expect(epoch).toBe(Date.UTC(2007, 1, 5, 14, 55, 0));
    });
  });

  describe('when the value comes from a Postgres date column', () => {
    it('anchors the day at midnight UTC', () => {
      // Arrange
      const date = '2026-06-03';

      // Act
      const epoch = toEpochMillis(date);

      // Assert
      expect(epoch).toBe(Date.UTC(2026, 5, 3));
    });
  });

  describe('when the same instant arrives in different formats', () => {
    it('resolves every format to the same epoch', () => {
      // Arrange
      const formatos = [
        '2023-02-01 12:00:00+00',
        '2023-02-01 12:00:00.000+00',
        '2023-02-01T12:00:00Z',
        '2023-02-01 09:00:00-03',
      ];

      // Act
      const epochs = formatos.map(toEpochMillis);

      // Assert
      expect(epochs).toEqual(epochs.map(() => Date.UTC(2023, 1, 1, 12)));
    });
  });

  describe('when a date column and a timestamptz column point at the same day', () => {
    it('places the date at the very start of that day', () => {
      // Arrange
      const date = '2023-02-01';
      const meiaNoite = '2023-02-01 00:00:00+00';

      // Act
      const epochDate = toEpochMillis(date);
      const epochTimestamptz = toEpochMillis(meiaNoite);

      // Assert
      expect(epochDate).toBe(epochTimestamptz);
    });
  });

  describe('when the value is not a parseable instant', () => {
    it('returns null instead of a NaN that would silently fail comparisons', () => {
      // Arrange
      const invalido = 'sem data';

      // Act
      const epoch = toEpochMillis(invalido);

      // Assert
      expect(epoch).toBeNull();
    });
  });
});

describe('toIsoUtc', () => {
  describe('when the value comes from a Postgres timestamptz column', () => {
    it('normalizes the space-separated format into ISO 8601', () => {
      // Arrange
      const timestamptz = '2026-08-21 05:51:47.06+00';

      // Act
      const iso = toIsoUtc(timestamptz);

      // Assert
      expect(iso).toBe('2026-08-21T05:51:47.060Z');
    });
  });

  describe('when the value carries a non-UTC offset', () => {
    it('shifts the instant to UTC instead of keeping the local offset', () => {
      // Arrange
      const timestamptz = '2026-08-21 02:51:47-03';

      // Act
      const iso = toIsoUtc(timestamptz);

      // Assert
      expect(iso).toBe('2026-08-21T05:51:47.000Z');
    });
  });

  describe('when the value is already ISO 8601', () => {
    it('keeps the same instant', () => {
      // Arrange
      const iso8601 = '2026-08-21T05:51:47.060Z';

      // Act
      const iso = toIsoUtc(iso8601);

      // Assert
      expect(iso).toBe('2026-08-21T05:51:47.060Z');
    });
  });

  describe('when the value is not a parseable instant', () => {
    it('returns null instead of an Invalid Date that would reach the contract', () => {
      // Arrange
      const invalido = 'sem data';

      // Act
      const iso = toIsoUtc(invalido);

      // Assert
      expect(iso).toBeNull();
    });
  });
});
