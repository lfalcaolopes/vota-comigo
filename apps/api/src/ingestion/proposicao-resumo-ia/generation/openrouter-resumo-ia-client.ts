import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';
import {
  proposicaoResumoIaGenerationResponseSchema,
  type ProposicaoResumoIaGenerationResponse,
} from './proposicao-resumo-ia-generation-response.schema';
import { buildProposicaoResumoIaPrompt } from './proposicao-resumo-ia-prompt';

export type ResumoIaGenerationDiagnostics = {
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  httpStatus?: number;
  openrouterError?: string;
  contentTail?: string;
};

// Terminal failures the orchestrator must not retry; absent means a retryable error.
export type ResumoIaGenerationFailureKind = 'source_too_large';

export type ResumoIaGenerationOutcome =
  | { ok: true; response: ProposicaoResumoIaGenerationResponse }
  | {
      ok: false;
      reason: string;
      failureKind?: ResumoIaGenerationFailureKind;
      diagnostics?: ResumoIaGenerationDiagnostics;
    };

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
          const errorBody = await safeJson(response);
          const openrouterError = extractOpenrouterError(errorBody);
          return {
            ok: false,
            reason: openrouterError
              ? `HTTP ${response.status}: ${openrouterError}`
              : `HTTP ${response.status}`,
            ...(isContextExceeded(openrouterError)
              ? { failureKind: 'source_too_large' as const }
              : {}),
            diagnostics: {
              httpStatus: response.status,
              ...(openrouterError ? { openrouterError } : {}),
            },
          };
        }

        const body = await response.json();

        const openrouterError = extractOpenrouterError(body);
        if (openrouterError !== null) {
          return {
            ok: false,
            reason: `erro OpenRouter: ${openrouterError}`,
            ...(isContextExceeded(openrouterError)
              ? { failureKind: 'source_too_large' as const }
              : {}),
            diagnostics: { ...extractDiagnostics(body), openrouterError },
          };
        }

        const diagnostics = extractDiagnostics(body);

        const content = extractContent(body);
        if (content === null) {
          return {
            ok: false,
            reason: `choices[0].message.content ausente na resposta${formatHint(diagnostics)}`,
            diagnostics,
          };
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          return {
            ok: false,
            reason: `resposta JSON inválida ou truncada${formatHint(diagnostics)}`,
            diagnostics: { ...diagnostics, contentTail: content.slice(-200) },
          };
        }

        const validated =
          proposicaoResumoIaGenerationResponseSchema.safeParse(parsed);
        if (!validated.success) {
          return {
            ok: false,
            reason: `schema inválido: ${validated.error.message}`,
            diagnostics,
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

async function safeJson(response: {
  json(): Promise<unknown>;
}): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

// Distinguishes a permanent context-overflow from a transient 502: both share
// code=502, so only the message text tells them apart.
function isContextExceeded(openrouterError: string | null): boolean {
  if (openrouterError === null) return false;
  return /exceeds the context|context window|maximum context|too large/i.test(
    openrouterError,
  );
}

function extractOpenrouterError(body: unknown): string | null {
  const record = asRecord(body);
  const error = record?.['error'];
  if (typeof error === 'string') return error;
  const errorRecord = asRecord(error);
  if (errorRecord === null) return null;
  const message = errorRecord['message'];
  const code = errorRecord['code'];
  const text = typeof message === 'string' ? message : 'erro sem mensagem';
  return code !== undefined ? `${text} (code=${String(code)})` : text;
}

function extractDiagnostics(body: unknown): ResumoIaGenerationDiagnostics {
  const record = asRecord(body);
  const diagnostics: ResumoIaGenerationDiagnostics = {};

  const choices = record?.['choices'];
  const firstChoice = Array.isArray(choices) ? asRecord(choices[0]) : null;
  const finishReason = firstChoice?.['finish_reason'];
  if (typeof finishReason === 'string') {
    diagnostics.finishReason = finishReason;
  }

  const usage = asRecord(record?.['usage']);
  const promptTokens = usage?.['prompt_tokens'];
  const completionTokens = usage?.['completion_tokens'];
  if (typeof promptTokens === 'number') {
    diagnostics.promptTokens = promptTokens;
  }
  if (typeof completionTokens === 'number') {
    diagnostics.completionTokens = completionTokens;
  }

  return diagnostics;
}

function formatHint(diagnostics: ResumoIaGenerationDiagnostics): string {
  const parts: string[] = [];
  if (diagnostics.finishReason !== undefined) {
    parts.push(`finish_reason=${diagnostics.finishReason}`);
  }
  if (diagnostics.completionTokens !== undefined) {
    parts.push(`completion_tokens=${diagnostics.completionTokens}`);
  }
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
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
