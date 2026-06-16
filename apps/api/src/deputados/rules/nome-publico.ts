export type NomePublicoInput = {
  nome: string | null;
  nomeCivil: string | null;
};

export function nomePublicoDeputado(input: NomePublicoInput): string | null {
  return input.nome ?? input.nomeCivil;
}
