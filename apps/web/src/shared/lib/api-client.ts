const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class EmptyQueryError extends Error {
  constructor(message = "Busca exige um termo") {
    super(message);
    this.name = "EmptyQueryError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE_URL + path);

  if (res.status === 404) {
    throw new NotFoundError();
  }

  if (!res.ok) {
    throw new ApiError(`Falha ao buscar ${path}`, res.status);
  }

  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    throw new NotFoundError();
  }

  if (!res.ok) {
    throw new ApiError(`Falha ao enviar ${path}`, res.status);
  }

  return (await res.json()) as T;
}
