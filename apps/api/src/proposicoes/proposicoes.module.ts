import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';
import { PROPOSICAO_EMBEDDING_DIM } from '@/shared/database/schema';
import {
  DEFAULT_EMBEDDING_MODEL,
  createOpenrouterEmbeddingClient,
} from '@/shared/embedding/openrouter-embedding-client';

import { ProposicoesController } from './proposicoes.controller';
import {
  PROPOSICOES_REPOSITORY,
  createProposicoesRepository,
} from './proposicoes.repository';
import { ProposicoesService } from './proposicoes.service';
import {
  QUERY_EMBEDDING,
  createQueryEmbedding,
  disabledQueryEmbedding,
  type QueryEmbedding,
} from './service/query-embedding';

// A busca degrada para tokens em vez de esperar o provider: o feed responde
// dentro do orcamento da requisicao.
const QUERY_EMBEDDING_TIMEOUT_MS = 2_000;

@Module({
  controllers: [ProposicoesController],
  providers: [
    ProposicoesService,
    {
      provide: PROPOSICOES_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createProposicoesRepository(db),
    },
    {
      provide: QUERY_EMBEDDING,
      inject: [ConfigService],
      useFactory: (config: ConfigService): QueryEmbedding =>
        toQueryEmbedding(config),
    },
  ],
})
export class ProposicoesModule {}

// Sem credencial a busca semantica nao sobe e o feed segue no plano de tokens,
// em vez de o servidor recusar a subir.
function toQueryEmbedding(config: ConfigService): QueryEmbedding {
  const apiKey = config.get<string>('OPENROUTER_API_KEY');
  if (apiKey === undefined || apiKey === '') {
    return disabledQueryEmbedding;
  }

  return createQueryEmbedding({
    client: createOpenrouterEmbeddingClient({
      apiKey,
      model:
        config.get<string>('OPENROUTER_EMBEDDING_MODEL') ||
        DEFAULT_EMBEDDING_MODEL,
      dimensions: PROPOSICAO_EMBEDDING_DIM,
      timeoutMs: QUERY_EMBEDDING_TIMEOUT_MS,
      maxAttempts: 1,
    }),
  });
}
