# Derivação de exercício do deputado

Este documento define como transformar `deputado_historico` em informação utilizável para responder se um deputado estava **Em exercício** em uma **Votação nominal**.

Ver também: [ADR 016](../adr/016-derivacao-intervalos-exercicio-deputado-historico.md).

## Fonte canônica

`deputado_historico` é a fonte canônica para derivar **Intervalos de exercício** e partido vigente no tempo.

`votacao_votos` não determina **Em exercício**. Ela complementa a análise apenas com o voto individual registrado.

## Regra de intervalo

Um **Intervalo de exercício** abre quando há posse ou reassunção:

- `descricao_status` contém segmento `Entrada -`;
- ou `descricao_status` indica `Primeira posse na legislatura (dados legados)`.

Um **Intervalo de exercício** fecha quando há afastamento ou encerramento:

- `descricao_status` contém segmento `Saída -`;
- `situacao` é `Licença`, `Suplência`, `Fim de Mandato` ou `Vacância`;
- ou `descricao_status` é `Situação e condição ao fim da legislatura (dados legados)`.

Eventos administrativos não alteram exercício por si só:

- snapshot inicial de legislatura;
- **Convocação** sem posse ou reassunção;
- **Alteração de partido**.

Quando um evento administrativo e um evento de transição aparecem no mesmo `data_hora`, a transição efetiva prevalece.

## Regra temporal

Para classificar um par deputado/votação, avaliar o último evento efetivo anterior ou igual à data e hora da votação.

- Se `data_hora_registro` existe, usar `data_hora_registro`.
- Se só `data` existe, usar a data civil como fallback.
- Se não há data utilizável, classificar como **Lacuna de dados**.

## Classificação deputado/votação

Classificar cada par **Deputado** e **Votação nominal** nesta ordem:

1. **Lacuna de dados**: não há histórico suficiente ou não há data utilizável da votação.
2. **Fora de exercício**: o deputado não estava **Em exercício** na data/hora da votação.
3. **Artigo 17**: há impedimento regimental registrado em `votacao_votos`.
4. **Voto não informado**: o voto individual veio vazio na fonte.
5. Voto computável: `sim`, `nao`, `abstencao` ou `obstrucao`.
6. **Ausência sem motivo conhecido**: o deputado estava **Em exercício**, mas não aparece em nenhuma categoria de `votacao_votos`.

## Efeito no matcher

| Classificação | Entra no denominador? | Efeito |
|---|---|---|
| **Lacuna de dados** | Não | Deputado excluído do ranking quando a lacuna impede determinar intervalos de exercício. |
| **Fora de exercício** | Não | Votação desconsiderada para o deputado. |
| **Artigo 17** | Não | Votação desconsiderada para o deputado. |
| **Voto não informado** | Não | Votação desconsiderada por qualidade de dado. |
| `sim` / `nao` | Sim | Comparado diretamente com a posição do usuário. |
| `abstencao` / `obstrucao` | Sim | Conta como discordância, preservando o voto real para exibição. |
| **Ausência sem motivo conhecido** | Sim | Conta como discordância. |

## Partido vigente

O partido do deputado na data da votação é derivado de `deputado_historico`.

Eventos de **Alteração de partido** atualizam o partido vigente, mas não abrem nem fecham **Intervalos de exercício**.

## Casos de teste obrigatórios

1. Posse atual com `Entrada - Posse de Eleito Titular` abre intervalo.
2. Reassunção com `Entrada - Reassunção` abre intervalo.
3. Registro legado de `Primeira posse na legislatura (dados legados)` abre intervalo.
4. `Saída - ... Término da Legislatura` fecha intervalo.
5. `Situação e condição ao fim da legislatura (dados legados)` fecha intervalo, mesmo quando `situacao = Exercício`.
6. `Licença` fecha exercício até uma próxima entrada.
7. `Suplência` fecha exercício de suplente até uma próxima entrada.
8. `Vacância` fecha exercício por falecimento, renúncia ou perda de mandato.
9. Snapshot inicial com `situacao = null` não abre intervalo.
10. **Convocação** não abre intervalo sem posse ou reassunção.
11. `situacao = Convocado` com `descricao_status` contendo `Entrada - Reassunção` abre intervalo.
12. **Alteração de partido** em exercício mantém exercício e troca partido vigente.
13. **Alteração de partido** durante licença mantém licença e troca partido vigente.
14. Eventos no mesmo `data_hora` priorizam entrada/saída sobre evento administrativo.
15. Deputado em exercício sem registro em `votacao_votos` vira **Ausência sem motivo conhecido**.
16. Deputado fora de exercício sem registro em `votacao_votos` fica fora do denominador.
17. Deputado em exercício com `Artigo 17` fica fora do denominador sem fechar intervalo.
18. Deputado em exercício com **Voto não informado** fica fora do denominador por qualidade de dado.
19. Votação sem data utilizável vira **Lacuna de dados** para a classificação.
