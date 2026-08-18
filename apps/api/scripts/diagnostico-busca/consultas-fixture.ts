import { readFileSync } from 'node:fs';

export type ConsultaFixture = {
  readonly consulta: string;
  readonly esperados: readonly number[];
  readonly nota: string;
};

export function loadConsultasFixture(
  filePath: string,
): readonly ConsultaFixture[] {
  const raw = readFixtureFile(filePath);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Fixture ${filePath} nao e JSON valido: ${(error as Error).message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Fixture ${filePath} deve ser um array de { consulta, esperados, nota }.`,
    );
  }

  const entries = parsed.map((entry, index) =>
    parseEntry(entry, index, filePath),
  );

  if (entries.length === 0) {
    throw new Error(`Fixture ${filePath} esta vazia. Nada a diagnosticar.`);
  }

  return sortByConsulta(entries);
}

function readFixtureFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Fixture de consultas nao encontrada em ${filePath}. Crie o arquivo com as consultas reais e seus esperados; este script nao inventa consultas nem esperados.`,
      );
    }
    throw error;
  }
}

function parseEntry(
  entry: unknown,
  index: number,
  filePath: string,
): ConsultaFixture {
  const at = `${filePath}[${index}]`;

  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new Error(`${at} deve ser um objeto.`);
  }

  const record = entry as Record<string, unknown>;
  const consulta = record.consulta;
  const esperados = record.esperados;
  const nota = record.nota;

  if (typeof consulta !== 'string' || consulta.trim() === '') {
    throw new Error(`${at}.consulta deve ser uma string nao vazia.`);
  }

  if (!Array.isArray(esperados)) {
    throw new Error(
      `${at}.esperados deve ser um array de external_id_proposicao.`,
    );
  }

  if (esperados.length === 0) {
    throw new Error(
      `${at}.esperados esta vazio (consulta ${JSON.stringify(consulta)}). Um esperado vazio nao diagnostica nada; preencha ou remova a entrada.`,
    );
  }

  const ids = esperados.map((id, position) => {
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      throw new Error(
        `${at}.esperados[${position}] deve ser um external_id_proposicao inteiro.`,
      );
    }
    return id;
  });

  if (typeof nota !== 'string') {
    throw new Error(`${at}.nota deve ser uma string.`);
  }

  return {
    consulta,
    esperados: [...new Set(ids)].sort((a, b) => a - b),
    nota,
  };
}

function sortByConsulta(
  entries: readonly ConsultaFixture[],
): readonly ConsultaFixture[] {
  return [...entries].sort((a, b) => {
    if (a.consulta !== b.consulta) {
      return a.consulta < b.consulta ? -1 : 1;
    }
    return 0;
  });
}
