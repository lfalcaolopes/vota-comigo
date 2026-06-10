import { InlineMessage } from "@/shared/ui";

export function CoberturaBanner() {
  return (
    <InlineMessage
      body="Vereadores, deputados estaduais, senadores e candidatos sem histórico de votação federal não aparecem nesta versão."
      title="Apenas deputados federais com histórico de votação"
      tone="neutral"
    />
  );
}
