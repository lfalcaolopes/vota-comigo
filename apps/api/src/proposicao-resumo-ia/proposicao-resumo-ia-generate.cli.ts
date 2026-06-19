import 'dotenv/config';

import { executeProposicaoResumoIaGenerate } from './proposicao-resumo-ia-generate';

void main();

async function main(): Promise<void> {
  const result = await executeProposicaoResumoIaGenerate(
    process.argv.slice(2),
    {
      reporter: {
        log(message) {
          console.log(message);
        },
      },
    },
  );

  if (!result.ok) {
    console.error(result.message);
  }

  process.exitCode = result.exitCode;
}
