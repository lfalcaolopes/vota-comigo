---
name: Quem Vota Comigo
description: Sistema de produto para transparência política baseada em votos reais da Câmara.
colors:
  bg: "oklch(1 0 0)"
  surface: "oklch(0.985 0.002 48)"
  surface-muted: "oklch(0.964 0.004 48)"
  border: "oklch(0.895 0.006 48)"
  border-strong: "oklch(0.78 0.012 48)"
  ink: "oklch(0.205 0.012 48)"
  muted: "oklch(0.455 0.018 48)"
  subtle: "oklch(0.62 0.014 48)"
  primary: "oklch(0.58 0.145 47.7)"
  primary-hover: "oklch(0.52 0.135 47.7)"
  primary-soft: "oklch(0.945 0.0285 47.7)"
  info: "oklch(0.55 0.115 235)"
  info-soft: "oklch(0.95 0.025 235)"
  success: "oklch(0.52 0.12 150)"
  success-soft: "oklch(0.94 0.035 150)"
  warning: "oklch(0.66 0.1339 72)"
  warning-soft: "oklch(0.95 0.04 72)"
  danger: "oklch(0.56 0.16 28)"
  danger-soft: "oklch(0.95 0.035 28)"
  focus: "oklch(0.68 0.16 47.7)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 720
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 680
    lineHeight: 1.35
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.3
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  pill: "999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "oklch(1 0 0)"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "oklch(1 0 0)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "2.75rem"
  input-default:
    backgroundColor: "oklch(1 0 0)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.75rem"
    height: "2.75rem"
  badge-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
---

# Design System: Quem Vota Comigo

## 1. Overview

**Creative North Star: "Mesa de Apuração Pública"**

O sistema visual organiza evidências públicas para decisão cívica: fonte oficial, método, comparação e limite metodológico aparecem com a mesma clareza. A interface serve ao trabalho do usuário, não à autopromoção do produto.

O tom visual é claro, confiável e sóbrio. A fundação usa componentes familiares, densidade controlada e pouca ornamentação para sustentar neutralidade por auditabilidade. Nada deve parecer torcida, campanha, placar esportivo ou marketing de ferramenta SaaS.

**Key Characteristics:**

- Produto antes de marca: componentes previsíveis, consistentes e acessíveis.
- Evidência visível: fonte, método e limites aparecem perto da decisão.
- Cor contida: âmbar cívico raro, usado para ação primária, foco e seleção.
- Mobile sério: alvos de toque confortáveis e texto resistente a labels longas.
- Movimento funcional: feedback curto para estados, sem coreografia decorativa.

## 2. Colors

A paleta é restrita: branco puro, neutros levemente vinculados ao âmbar, texto grafite de alto contraste e cores semânticas para estados.

### Primary

- **Âmbar Cívico**: acento principal para ação primária, foco, seleção e pequenos marcadores ativos. O valor normativo é `oklch(0.58 0.145 47.7)`, corrigido para sRGB e contraste AA com texto branco.

### Secondary

- **Azul Fonte**: cor informativa para links de fonte oficial e contexto de dados. Use apenas para navegação informativa, não como segundo CTA concorrente.

### Tertiary

- **Estados Semânticos**: sucesso, alerta e erro usam verde, âmbar de alerta e vermelho apenas quando há significado operacional. Não são decoração.

### Neutral

- **Branco Público**: fundo principal, `oklch(1 0 0)`. Não usar creme, areia ou papel envelhecido.
- **Superfície Técnica**: painéis e áreas de comparação, `oklch(0.985 0.002 48)`.
- **Tinta Institucional**: texto principal, `oklch(0.205 0.012 48)`.
- **Linha de Método**: bordas e divisores, `oklch(0.895 0.006 48)`.

### Named Rules

**The Evidence First Rule.** Cor nunca substitui texto, amostra, fonte ou explicação metodológica.

**The ≤10% Accent Rule.** O âmbar deve ocupar uma fração pequena de cada tela. Se a tela parece laranja, está errada.

## 3. Typography

**Display Font:** Geist, com fallback `system-ui, sans-serif`  
**Body Font:** Geist, com fallback `system-ui, sans-serif`  
**Label/Mono Font:** Geist Mono apenas para IDs, timestamps, valores tabulares e exemplos de token.

**Character:** A tipografia é uma sans de produto: firme, legível e pouco teatral. A confiança vem de hierarquia, contraste e espaçamento, não de uma fonte display expressiva.

### Hierarchy

- **Display** (720, `2.25rem`, `1.15`): títulos de páginas públicas e entradas principais de fluxo.
- **Headline** (700, `1.75rem`, `1.15`): seções como ranking, matcher, perfil e comparativo.
- **Title** (680, `1.125rem`, `1.35`): painéis, linhas de resultado e blocos de detalhe.
- **Body** (400, `1rem`, `1.55`): explicações, metodologia e mensagens de borda, com medida máxima de 65-75ch.
- **Label** (650, `0.875rem`, `1.3`): rótulos de controles, filtros, metadados e badges.

### Named Rules

**The Plain Portuguese Rule.** Texto de interface é português brasileiro claro, com termos canônicos do domínio preservados e explicados quando necessário.

**The Product Scale Rule.** Títulos usam escala fixa em `rem`, não tipografia fluida de landing page.

## 4. Elevation

O sistema é plano por padrão. Profundidade vem de camada tonal, borda e espaçamento. Sombras são reservadas para superfícies temporárias como popover, menu, modal e toast.

### Shadow Vocabulary

- **Popover** (`0 8px 24px oklch(0.205 0.012 48 / 0.12)`): menus, dropdowns e superfícies sobrepostas.

### Named Rules

**The No Glass Rule.** Glassmorphism, blur decorativo e cards translúcidos são proibidos.

**The State Shadow Rule.** Se uma sombra não comunica interação, sobreposição ou foco temporário, ela não deve existir.

## 5. Components

Os primitivos vivem em `apps/web/src/components/ui` e usam classes `vc-*` definidas em `apps/web/src/app/globals.css`.

### Buttons

- **Shape:** cantos moderados (`0.5rem`) e altura mínima de `2.75rem`.
- **Primary:** fundo Âmbar Cívico com texto branco, usado apenas para a ação principal.
- **Hover / Focus:** hover escurece para `primary-hover`; foco usa anel evidente `focus`.
- **Secondary / Ghost / Tertiary:** secundário usa fundo branco e borda; ghost usa fundo transparente e hover tonal.

### Chips

- **Style:** chips funcionais com borda, `pill` radius e altura mínima de `2.25rem`.
- **State:** selecionado usa fundo `primary-soft`, borda `primary` e `aria-pressed`.

### Cards / Containers

- **Corner Style:** painéis usam `0.75rem`.
- **Background:** `surface` ou branco, nunca vidro.
- **Shadow Strategy:** plano por padrão.
- **Border:** `border` organiza listas, comparações e blocos de metodologia.
- **Internal Padding:** `1.25rem` em painéis padrão.

### Inputs / Fields

- **Style:** fundo branco, borda visível, altura mínima de `2.75rem`.
- **Focus:** anel global `focus-visible`.
- **Error / Disabled:** erro muda borda e mensagem; disabled reduz opacidade e usa superfície neutra.

### Navigation

- **Style:** tabs e segmented controls usam vocabulário comum: trilho neutro, item ativo branco, rótulo claro e foco visível.

## 6. Do's and Don'ts

### Do:

- **Do** mostrar fonte oficial, data, amostra e limite metodológico perto de rankings, percentuais e resultados.
- **Do** usar o âmbar apenas para ação primária, seleção e foco.
- **Do** manter todos os controles com estado default, hover, focus-visible, active, disabled e erro quando aplicável.
- **Do** projetar primeiro para leitura e toque em mobile.
- **Do** preservar termos do domínio como deputado, proposição, votação, bancada, orientação e compatibilidade.

### Don't:

- **Don't** parecer campanha política, propaganda partidária, placar esportivo de torcida ou dashboard corporativo genérico.
- **Don't** usar estética de landing page SaaS, hero com métricas grandiosas, gradientes ornamentais ou ilustrações genéricas.
- **Don't** usar glassmorphism, blur decorativo ou cards translúcidos.
- **Don't** esconder candidatos novos, vereadores, deputados estaduais, senadores ou outros perfis fora da base do MVP.
- **Don't** usar `border-left` ou `border-right` maior que 1px como faixa colorida em cards, alertas ou callouts.
- **Don't** combinar borda de 1px com sombra larga decorativa em cards ou botões.
- **Don't** usar cantos de 32px ou mais em cards, seções ou inputs.
