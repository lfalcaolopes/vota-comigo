import { z } from 'zod';

export const deputadoPerfilSchema = z.object({
  externalIdDeputado: z.number(),
  nomePublico: z.string().nullable(),
  nomeCivil: z.string().nullable(),
  fonteOficial: z.string(),
  historicoParlamentarDisponivel: z.boolean(),
});

export type DeputadoPerfil = z.infer<typeof deputadoPerfilSchema>;
