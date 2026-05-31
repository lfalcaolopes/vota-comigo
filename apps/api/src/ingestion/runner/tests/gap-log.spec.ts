import { writeGapLog } from '../gap-log';
import type { GapLogFileSystem } from '../gap-log';
import type { ExternalGap } from '../ingestion-runner.types';

function createFakeFileSystem(): GapLogFileSystem & {
  readonly writes: { path: string; content: string }[];
  readonly directories: string[];
} {
  const writes: { path: string; content: string }[] = [];
  const directories: string[] = [];

  return {
    writes,
    directories,
    async mkdir(path) {
      directories.push(path);
    },
    async writeFile(path, content) {
      writes.push({ path, content });
    },
  };
}

const gap = (reference: string): ExternalGap => ({
  file: 'deputado_historico',
  type: 'fonte_externa_indisponivel',
  reference,
  message: `Histórico indisponível para o deputado ${reference}: 503 Service Unavailable.`,
});

describe('gap log', () => {
  describe('when there are external gaps', () => {
    it('writes one JSON object per line to a timestamped file and returns its path', async () => {
      // Arrange
      const fileSystem = createFakeFileSystem();
      const gaps = [gap('220593'), gap('999999')];

      // Act
      const path = await writeGapLog(gaps, {
        fileSystem,
        now: () => new Date('2026-05-30T12:00:00.000Z'),
      });

      // Assert
      expect(path).toBe('data/logs/gaps/gaps-2026-05-30T12-00-00-000Z.log');
      expect(fileSystem.directories).toContain('data/logs/gaps');
      expect(fileSystem.writes).toHaveLength(1);
      expect(fileSystem.writes[0].path).toBe(path);
      expect(fileSystem.writes[0].content).toBe(
        [JSON.stringify(gaps[0]), JSON.stringify(gaps[1])].join('\n') + '\n',
      );
    });
  });
});
