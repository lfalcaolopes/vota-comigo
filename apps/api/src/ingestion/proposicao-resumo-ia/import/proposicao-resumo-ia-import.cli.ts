import 'dotenv/config';

import { executeProposicaoResumoIaImport } from './proposicao-resumo-ia-import';

void main();

async function main(): Promise<void> {
  const result = await executeProposicaoResumoIaImport(process.argv.slice(2), {
    reporter: {
      log(message) {
        console.log(message);
      },
    },
  });

  if (!result.ok) {
    console.error(result.message);
  }

  process.exitCode = result.exitCode;
}
