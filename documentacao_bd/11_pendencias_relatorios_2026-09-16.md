# Relatórios — decisões e pendências para retomada

Registro solicitado em 16/09/2026. Somente documentação: não autoriza implementar Relatórios. A análise anterior foi feita pelo código, sem validação completa em execução; conferir o estado atual ao retomar.

## Confirmado pelo usuário

- Distribuir vendas de combos pelos produtos componentes. O critério de distribuição monetária ainda não foi aprovado.
- Manter os pagamentos associados ao período de referência do pedido, não à data em que o pagamento chegou. Na conversa, isso foi interpretado como o período agendado de entrega/retirada: pagamento em setembro para entrega em outubro aparece em outubro. Não migrar para regime por data do lançamento sem confirmação; explicitar essa interpretação na retomada.
- Manter os períodos próprios dos gráficos: alguns seguem o filtro; outros apresentam histórico específico. Não uniformizar indiscriminadamente.
- Preservar o design original. Estoque fora do escopo.

## Decisões ainda pendentes

1. Rateio do valor dos combos: foi sugerido rateio proporcional aos preços dos componentes registrados na venda, mas ainda não confirmado. Exemplo: combo de R$ 90 contendo bolo de preço avulso R$ 80 e doces de R$ 40 resulta em R$ 60 e R$ 30. Conferir quais preços históricos estão efetivamente disponíveis; não inventar dados. Definir tratamento para base de rateio zero e arredondamento preservando o total.
2. Ticket médio e recorrência: foi sugerido excluir cancelados dos denominadores e da contagem de compras recorrentes, sem confirmação. Exemplo: uma venda válida de R$ 100 e um cancelado podem resultar em média R$ 100 ou R$ 50 conforme o critério. Cancelados continuam no histórico e fora do faturamento, regra já aprovada.
3. Apresentação financeira: proposta ainda não confirmada de identificar recebimento bruto, estornos e recebido líquido, complementando o gráfico por forma de pagamento. Exemplo: R$ 100 recebidos e R$ 30 estornados deixam R$ 70 líquidos. Os totais de estorno e excedente já existem no resumo; falta decidir o detalhamento desejado.
4. Exportação: proposta ainda não confirmada de manter CSV e adicionar recebido, estornado, líquido, saldo a receber e excedente. A exportação atual é uma lista básica de pedidos; decidir se também haverá detalhamento de lançamentos.

## Problemas e verificações identificados na análise anterior

- Combos podem aparecer como “Produto removido” pela conversão indevida de identificadores; revisar rankings e categorias.
- Histórico mensal por categoria inclui cancelados, divergindo da regra de faturamento.
- Distribuição de status não apresenta cancelados.
- Ticket médio e recorrência atualmente contam cancelados; mudança depende das decisões acima.
- Seleção financeira usa o agendamento do pedido, não datas dos lançamentos; preservar a escolha do usuário.
- Gráfico por forma de pagamento soma valores brutos, sem descontar estornos; identificar isso claramente conforme decisão futura.
- Faixa fixa do gráfico de horários pode omitir agendamentos fora dela.
- Conferir quantidades reais, pacotes, composição histórica, descontos, alterações cadastrais e arredondamento.
- Validar com cenários de pagamento parcial, excedente, rejeição, cancelamento e estorno parcial/integral; verificar consistência entre API, gráficos e exportação.
- Apresentar carregamento e erros de consulta, distinguindo-os de ausência de vendas.
- Avaliar consultas agregadas específicas para maior volume; atualmente parte dos cálculos usa a coleção de pedidos no navegador.

## Próxima etapa

Retomar as decisões pendentes com o usuário antes de implementar regras novas. Não interpretar sugestões desta nota como aprovações. Produção é um escopo separado e suas decisões foram encerradas na conversa.
