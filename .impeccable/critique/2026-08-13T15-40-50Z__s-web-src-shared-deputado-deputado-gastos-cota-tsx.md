---
target: apps/web/src/shared/deputado/deputado-gastos-cota.tsx
total_score: 33
p0_count: 0
p1_count: 2
timestamp: 2026-08-13T15-40-50Z
slug: s-web-src-shared-deputado-deputado-gastos-cota-tsx
---
## Design Health Score

| # | Heurística | Nota | Observação |
|---|---|---:|---|
| 1 | Visibilidade do estado | 4 | Cobertura, carregamento, vazio e falha estão explícitos. |
| 2 | Correspondência com o mundo real | 4 | Total parcial e mediana agora trazem o denominador junto do valor. |
| 3 | Controle e liberdade | 3 | Seleções podem ser limpas por novo acionamento, Escape ou botão. |
| 4 | Consistência e padrões | 4 | Estados e tipografia seguem as demais seções do perfil. |
| 5 | Prevenção de erros | 4 | Lacuna de cobertura não é apresentada como zero. |
| 6 | Reconhecimento em vez de lembrança | 3 | Cores são compartilhadas e há controles textuais; a seção ainda é densa. |
| 7 | Flexibilidade e eficiência | 3 | Ponteiro, toque e teclado têm caminhos equivalentes em HTML. |
| 8 | Estética e minimalismo | 3 | Legenda duplicada foi removida e a tabela ficou recolhível. |
| 9 | Recuperação de erros | 3 | A falha é local e acionável, mas não há tentativa manual imediata. |
| 10 | Ajuda e documentação | 2 | Fonte e explicações estão próximas, sem documentação contextual adicional. |
| **Total** | | **33/40** | **Bom** |

## Veredito de anti-patterns

A interface não parece gerada por IA. O detector determinístico não encontrou ocorrências. O desenho permanece sóbrio, plano e coerente com o sistema visual do produto, sem gradientes ornamentais, glassmorphism, cardificação ou movimento decorativo.

## Impressão geral

A seção agora comunica a cobertura antes de o usuário interpretar o total, preserva uma única rota acessível para cada gráfico e reduz a repetição no celular. O principal trabalho restante é a validação física com leitor de tela e aparelho real exigida pela issue #123.

## Pontos positivos

- O total parcial diz explicitamente o intervalo coberto.
- A mediana informa UF, tamanho da amostra e exercício anual completo na mesma frase.
- Os SVGs são decorativos para tecnologia assistiva; botões, seletores e tabela fornecem nomes e valores em HTML.
- A tabela mensal é recolhível, mantém estrutura semântica e contém sua própria rolagem horizontal.
- Meses não carregados têm texto próximo ao gráfico, borda tracejada e legenda, sem depender apenas de cor.
- Movimento reduzido remove as transições dos segmentos, e os gráficos não animam a entrada.

## Questões prioritárias remanescentes

- **[P1] Validação com leitor de tela real**: confirmar ordem, pronúncia dos valores e anúncio atômico da região persistente em NVDA ou VoiceOver.
- **[P1] Validação em aparelho real**: confirmar toque nos segmentos, conforto dos seletores e visibilidade da região persistente sem depender de emulação.
- **[P2] Densidade em telas pequenas**: a seção continua longa por natureza; a tabela já usa divulgação progressiva e a legenda mensal duplicada foi removida.

## Personas

- **Sam, usuário de tecnologia assistiva**: encontra uma lista anual com categoria e valor no nome acessível, dois seletores mensais e uma tabela estruturada opcional. O anúncio real ainda precisa ser conferido com NVDA ou VoiceOver.
- **Casey, usuário mobile distraído**: vê cobertura antes do total, rosca menor, controles de 44 px e tabela recolhida. O gesto sobre segmentos estreitos ainda precisa ser conferido em aparelho físico.
- **Cidadão não especialista**: entende que o total é parcial e que a comparação usa deputados da mesma UF que exerceram o ano inteiro.

## Perguntas para a validação humana

- O leitor de tela anuncia mês, categoria e valor como uma única atualização compreensível?
- Em aparelho real, tocar nas barras é confortável ou os seletores se tornam o caminho principal?
- A tabela recolhível oferece detalhe suficiente sem aumentar a densidade inicial?
