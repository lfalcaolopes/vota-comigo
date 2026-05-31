import { writeErrorLog } from '../error-log';
import type { ErrorLogFileSystem } from '../error-log';
import type { Rejection } from '../ingestion-runner.types';

function createFakeFileSystem(): ErrorLogFileSystem & {
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

const rejection = (line: number): Rejection => ({
  file: 'legislaturas.csv',
  line,
  type: 'validacao_id_invalido',
  fields: { idLegislatura: 'abc' },
  message: 'idLegislatura inválido: "abc".',
});

describe('error log', () => {
  describe('when there are rejected rows', () => {
    it('writes one JSON object per line to a timestamped file and returns its path', async () => {
      // Arrange
      const fileSystem = createFakeFileSystem();
      const rejections = [rejection(2), rejection(5)];

      // Act
      const path = await writeErrorLog(rejections, {
        fileSystem,
        now: () => new Date('2026-05-30T12:00:00.000Z'),
      });

      // Assert
      expect(path).toBe('data/logs/errors/errors-2026-05-30T12-00-00-000Z.log');
      expect(fileSystem.directories).toContain('data/logs/errors');
      expect(fileSystem.writes).toHaveLength(1);
      expect(fileSystem.writes[0].path).toBe(path);
      expect(fileSystem.writes[0].content).toBe(
        [JSON.stringify(rejections[0]), JSON.stringify(rejections[1])].join(
          '\n',
        ) + '\n',
      );
    });
  });
});
