import { z } from "zod";

export const APURACAO_SNAPSHOT_STEP = 5;

export const apuracaoSnapshotSourceEnum = z.enum(["site", "backfill"]);

export const apuracaoSnapshotEventSchema = z.object({
  externalCdEleicao: z.string().min(1),
  urnasStep: z
    .number()
    .int()
    .min(APURACAO_SNAPSHOT_STEP)
    .max(100)
    .multipleOf(APURACAO_SNAPSHOT_STEP),
  urnasApuradas: z.number().min(0).max(100),
  numeroA: z.string().min(1),
  numeroB: z.string().min(1),
  oficialShareA: z.number().min(0).max(1),
  projecaoShareA: z.number().min(0).max(1),
  tseUpdatedAt: z.string().min(1),
  source: apuracaoSnapshotSourceEnum,
});

export type ApuracaoSnapshotSource = z.infer<typeof apuracaoSnapshotSourceEnum>;
export type ApuracaoSnapshotEvent = z.infer<typeof apuracaoSnapshotEventSchema>;
