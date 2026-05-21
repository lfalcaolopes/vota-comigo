# Estratégia de persistência: storage de inputs, não de scores

O banco armazena os inputs de cálculo da fórmula de relevância (contagens do placar, código de tipo de proposição, flag de apelido popular e demais sinais ingeridos) e nunca o score final. O score é calculado em runtime ou em job derivado, a partir dos inputs persistidos.

A fórmula de relevância é, por desenho, calibrável: os pesos dos fatores são candidatos a ajuste conforme o ranking for validado contra dados reais e, eventualmente, conforme novos fatores forem incorporados. Persistir o score pré-computado otimizaria leitura, mas amarraria a calibração — qualquer mudança de peso obrigaria rodar batch sobre toda a base histórica de votações. O custo computacional de recalcular o score a partir dos inputs é baixo; o custo de reprocessar a ingestão para recalibrar é alto e cresce monotonicamente com o tempo de vida do projeto.

O mesmo princípio se aplica a quaisquer outras métricas derivadas que vierem a existir: armazenam-se os componentes auditáveis, e a métrica final é função desses componentes.