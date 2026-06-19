import 'dotenv/config';

import { executeProposicaoResumoIaReconcile } from './proposicao-resumo-ia-reconcile';

void main();

async function main(): Promise<void> {
  const result = await executeProposicaoResumoIaReconcile(process.argv.slice(2), {
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
