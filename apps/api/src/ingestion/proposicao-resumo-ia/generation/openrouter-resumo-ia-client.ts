import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';
import {
  proposicaoResumoIaGenerationResponseSchema,
  type ProposicaoResumoIaGenerationResponse,
} from './proposicao-resumo-ia-generation-response.schema';
import { buildProposicaoResumoIaPrompt } from './proposicao-resumo-ia-prompt';

export type ResumoIaGenerationOutcome =
  | { ok: true; response: ProposicaoResumoIaGenerationResponse }
  | { ok: false; reason: string };

export interface ResumoIaGenerationClient {
  generate(
    source: ProposicaoResumoIaSource,
  ): Promise<ResumoIaGenerationOutcome>;
}

type FetchFn = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type CreateOpenrouterResumoIaClientOptions = {
  apiKey: string;
  model: string;
  fetch?: FetchFn;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PDF_PARSER_ENGINE = 'native';

export function createOpenrouterResumoIaClient(
  options: CreateOpenrouterResumoIaClientOptions,
): ResumoIaGenerationClient {
  const fetchImpl: FetchFn = options.fetch ?? globalThis.fetch;

  return {
    async generate(source): Promise<ResumoIaGenerationOutcome> {
      try {
        const response = await fetchImpl(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildRequestBody(source, options.model)),
        });

        if (!response.ok) {
          return { ok: false, reason: `HTTP ${response.status}` };
        }

        const body = await response.json();
        const content = extractContent(body);
        if (content === null) {
          return {
            ok: false,
            reason: 'choices[0].message.content ausente na resposta',
          };
        }

        const parsed = JSON.parse(content) as unknown;
        const validated =
          proposicaoResumoIaGenerationResponseSchema.safeParse(parsed);
        if (!validated.success) {
          return {
            ok: false,
            reason: `schema inválido: ${validated.error.message}`,
          };
        }

        return { ok: true, response: validated.data };
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : 'erro desconhecido',
        };
      }
    },
  };
}

function buildRequestBody(
  source: ProposicaoResumoIaSource,
  model: string,
): Record<string, unknown> {
  const prompt = buildProposicaoResumoIaPrompt(source);
  const base = {
    model,
    response_format: { type: 'json_object' },
  };

  if (source.urlInteiroTeor === null) {
    return { ...base, messages: [{ role: 'user', content: prompt }] };
  }

  return {
    ...base,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'file',
            file: {
              filename: `inteiro-teor-${source.externalIdProposicao}.pdf`,
              file_data: source.urlInteiroTeor,
            },
          },
        ],
      },
    ],
    plugins: [{ id: 'file-parser', pdf: { engine: PDF_PARSER_ENGINE } }],
  };
}

function extractContent(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const choices = (body as Record<string, unknown>)['choices'];
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as unknown;
  if (typeof first !== 'object' || first === null) return null;
  const message = (first as Record<string, unknown>)['message'];
  if (typeof message !== 'object' || message === null) return null;
  const content = (message as Record<string, unknown>)['content'];
  return typeof content === 'string' ? content : null;
}
