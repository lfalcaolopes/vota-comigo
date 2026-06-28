import {
  resolveTracesSampleRate,
  shouldInitSentry,
} from '../should-init-sentry';

describe('shouldInitSentry', () => {
  describe('when running in production with a DSN', () => {
    it('initializes', () => {
      // Arrange / Act
      const result = shouldInitSentry({
        dsn: 'https://key@o0.ingest.sentry.io/1',
        nodeEnv: 'production',
      });

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('when the DSN is missing or blank', () => {
    it('does not initialize even in production', () => {
      // Arrange / Act
      const undefinedDsn = shouldInitSentry({
        dsn: undefined,
        nodeEnv: 'production',
      });
      const blankDsn = shouldInitSentry({
        dsn: '   ',
        nodeEnv: 'production',
      });

      // Assert
      expect(undefinedDsn).toBe(false);
      expect(blankDsn).toBe(false);
    });
  });

  describe('when not running in production', () => {
    it('does not initialize even with a DSN', () => {
      // Arrange
      const dsn = 'https://key@o0.ingest.sentry.io/1';

      // Act / Assert
      expect(shouldInitSentry({ dsn, nodeEnv: 'development' })).toBe(false);
      expect(shouldInitSentry({ dsn, nodeEnv: 'test' })).toBe(false);
      expect(shouldInitSentry({ dsn, nodeEnv: undefined })).toBe(false);
    });
  });
});

describe('resolveTracesSampleRate', () => {
  describe('when given a valid rate within [0, 1]', () => {
    it('uses it', () => {
      // Arrange / Act / Assert
      expect(resolveTracesSampleRate('0')).toBe(0);
      expect(resolveTracesSampleRate('0.25')).toBe(0.25);
      expect(resolveTracesSampleRate('1')).toBe(1);
    });
  });

  describe('when given an absent or invalid rate', () => {
    it('falls back to 0.1', () => {
      // Arrange / Act / Assert
      expect(resolveTracesSampleRate(undefined)).toBe(0.1);
      expect(resolveTracesSampleRate('not-a-number')).toBe(0.1);
      expect(resolveTracesSampleRate('-0.5')).toBe(0.1);
      expect(resolveTracesSampleRate('2')).toBe(0.1);
    });
  });
});
