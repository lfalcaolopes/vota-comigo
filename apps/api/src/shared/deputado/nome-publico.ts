export type NomePublicoInput = {
  nomeEleitoral: string | null;
  nome: string | null;
  nomeCivil: string | null;
};

export function nomePublicoDeputado(input: NomePublicoInput): string | null {
  return input.nomeEleitoral ?? input.nome ?? input.nomeCivil;
}
