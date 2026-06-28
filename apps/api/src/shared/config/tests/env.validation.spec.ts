import { validateEnv } from '../env.validation';

function baseEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    ...overrides,
  };
}

describe('validateEnv', () => {
  describe('when Sentry vars are absent', () => {
    it('passes and leaves them undefined', () => {
      // Arrange
      const config = baseEnv();

      // Act
      const env = validateEnv(config);

      // Assert
      expect(env.SENTRY_DSN).toBeUndefined();
      expect(env.SENTRY_TRACES_SAMPLE_RATE).toBeUndefined();
    });
  });

  describe('when Sentry vars are valid', () => {
    it('parses the DSN and coerces the sample rate', () => {
      // Arrange
      const config = baseEnv({
        SENTRY_DSN: 'https://key@o0.ingest.sentry.io/1',
        SENTRY_TRACES_SAMPLE_RATE: '0.1',
      });

      // Act
      const env = validateEnv(config);

      // Assert
      expect(env.SENTRY_DSN).toBe('https://key@o0.ingest.sentry.io/1');
      expect(env.SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
    });
  });

  describe('when the DSN is not a URL', () => {
    it('throws', () => {
      // Arrange
      const config = baseEnv({ SENTRY_DSN: 'not-a-url' });

      // Act / Assert
      expect(() => validateEnv(config)).toThrow(/SENTRY_DSN/);
    });
  });

  describe('when the sample rate is outside [0, 1]', () => {
    it('throws', () => {
      // Arrange
      const config = baseEnv({ SENTRY_TRACES_SAMPLE_RATE: '2' });

      // Act / Assert
      expect(() => validateEnv(config)).toThrow(/SENTRY_TRACES_SAMPLE_RATE/);
    });
  });
});
