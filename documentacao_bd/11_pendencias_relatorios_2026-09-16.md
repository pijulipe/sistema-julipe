# Relatórios — decisões e entrega local em 21/09/2026

As decisões finais do usuário substituem as propostas de 16/09/2026 (rateio de combos, decisões pendentes e ampliação do CSV). Foram registradas antes da implementação. Esta entrega é local, sem alterações remotas.

## Decisões aprovadas

- Combos são itens próprios; não distribuir receita ou quantidade pelos componentes. Categoria “Combos” existe somente no relatório. Identificadores textuais distinguem produto e combo, inclusive BIGINT com a mesma parte numérica.
- Usar fotografias dos pedidos, quantidades reais e preço por pacote. Conservar a distribuição proporcional do desconto já existente, sem mudar a política de descontos.
- Cancelados não entram no faturamento, denominador do ticket ou compras para recorrência. Permanecem no histórico, CSV, status e contagens operacionais. Pagamentos e estornos de cancelados continuam contabilizados.
- Distinguir recebido bruto, estornado e recebido líquido; preservar saldo a receber e excedente. Rejeitados não contam; estornos parciais descontam somente o registrado.
- Período segue o agendamento da entrega/retirada, inclusive quando o pagamento ocorreu em outro mês. Preservar filtros diários e intervalos, histórico semanal completo, histórico mensal de seis meses e recorrência até o fim do filtro.
- Preservar design, componentes, cores, espaços e navegação. CSV mantém formato, colunas e finalidade. Sem mudanças em banco, RLS, permissões, estoque, Produção ou implantação.

## Correções implementadas

- Ajuste posterior solicitado pelo usuário: removidos todos os gráficos e agrupamentos por bairro de Relatórios (Faturamento por Bairro, Clientes por Bairro e Entregas por Bairro), incluindo cálculos e referências na busca. Os demais relatórios e os endereços dos pedidos/clientes permanecem preservados.

- Agregação por fotografia em `client/src/utils/relatorios.js`, sem acessar Produtos, Combos ou Clientes administrativos. Nome histórico e chave composta textual substituem a busca cadastral e a conversão numérica dos IDs no relatório.
- Combos aparecem no ranking, detalhamento, donut e histórico mensal, sem componentes duplicados. O cartão continua contando itens distintos, agora rotulado “Produtos/combos distintos”.
- Quantidade de avulsos permanece em unidades reais; faturamento usa o subtotal persistido, que já considera o múltiplo do pacote.
- Desconto proporcional usa BigInt em centavos com arredondamento acumulado: cada linha recebe a diferença entre acumulados arredondados, conservando exatamente o total do pedido. Não recalcula a regra comercial de desconto.
- Cancelados são excluídos dos cálculos de vendas, ticket, compras do ranking e recorrência, inclusive no histórico mensal. Distribuição de status e funil passam a identificá-los. Contagens operacionais permanecem sobre a coleção completa.
- Resumo, cartões e gráficos usam a mesma coleção consistente do painel de Pedidos. O resumo de Relatórios recebe valores agregados diretamente, eliminando a consulta paralela de indicadores por filtro. O uso existente do resumo no Início permanece compatível e com os rótulos anteriores.
- Recebido bruto, estornado, líquido, saldo e excedente agregam os valores calculados pela API. O gráfico de formas soma lançamentos não rejeitados em centavos e informa que representa valores brutos no período agendado.
- Faixa original de horários é ampliada pelos horários presentes; valores ausentes/inválidos não viram meia-noite. A última faixa recebe rótulo visível.
- Datas personalizadas em edição só são aplicadas pelo botão Aplicar; intervalos invertidos são impedidos. Datas sem horário continuam locais.
- Carregamento inicial, falha e nova tentativa ocultam resultados, evitando zeros confiáveis em falhas. Não há requisição filtrada concorrente: a mudança de filtro calcula todos os valores sobre a mesma fotografia da coleção já carregada. Atualização periódica, controle de sequência e logout do Provider existente foram preservados.
- Legados sem fotografia continuam fora dos cálculos. Registros sem agendamento reconciliado recebem aviso próprio, sem atribuição inventada a um período.
- Exportador CSV permaneceu inalterado, inclusive cancelados e as onze colunas existentes.

## Validação executada

- Backend: `node --test`, 128 testes passaram. Teste novo usa somente RELATORIO, consulta fotografia/financeiro com ID BIGINT, preserva recebimento de cancelado e rejeita consulta após revogação. Não depende de permissões administrativas de cadastros.
- Frontend: suíte geral passou, incluindo os oito testes existentes de Produção. A execução final específica de Relatórios passou nos 15 testes: pacotes, combos, IDs coincidentes/BIGINT, resíduos do desconto, cancelamentos, finanças parcial/rejeitada/excedente/estornos, horários externos, legados, renderização das cinco abas, erro/carregamento/vazio, CSV com escape de aspas e limites locais de data, ticket, recorrência e pagamento em mês diferente do agendamento.
- Build: `node node_modules/vite/bin/vite.js build`, concluído.
- Lint: `node node_modules/oxlint/bin/oxlint`, sem erros. Permanecem os 15 avisos anteriores de Fast Refresh/dependência de hook e o aviso de pacote JavaScript acima de 500 kB no build.
- `git diff --check`, sem erros de whitespace.
- Comparação visual no navegador local com Providers substitutos e dados fictícios, usando a versão do Git antes das mudanças e a atual. Em desktop (1440 px), conferidos cartões, rankings, gráficos, categoria Combos, histórico e financeiro; em 390 px, comparada a organização original e atual do Financeiro. Mantidos estilos, posições e componentes; somente valores, rótulos, séries e cartões financeiros necessários foram acrescentados.
- Cenário visual: 50 coxinhas por R$ 40, dois combos por R$ 180 e um cancelado. Faturamento R$ 220, ticket R$ 110, bruto R$ 240, estorno R$ 30, líquido R$ 210 e saldo R$ 50. A categoria Combos aparece com R$ 180; horários 06h e 23h são representados.
- No navegador, edição do intervalo conserva os resultados até Aplicar. Ao aplicar 02/10–04/10 sem vendas, resumo, cartões e gráfico financeiro mudaram juntos para o período vazio, sem manter os valores anteriores.

## Limitações e problemas preexistentes

- A inspeção visual usa o painel real com dados e Providers locais substitutos; não é uma homologação com Supabase, autenticação remota ou banco real. Não foram aplicadas migrações nem executados testes destrutivos. A suíte de integração PostgreSQL não foi reexecutada, pois não houve alteração de persistência/backend de produção.
- O painel ainda recebe a coleção completa de Pedidos; agregação no banco para grandes volumes permanece fora do escopo.
- Registros legados precisam de reconciliação explícita e continuam sinalizados. Não foram inventadas composições, pagamentos ou datas.
- A barra de abas já ultrapassava a largura em 390 px na versão original; mantida, sem redesenho. A comparação também confirmou o aviso React preexistente sobre espalhar a propriedade key nos cartões; não houve alteração desse padrão nesta entrega.
- Nenhuma alteração de produção no backend, em permissões, RLS, banco, Storage ou implantação. Produção, Expedição e fluxos de edição de Pedidos não foram modificados.

## Reproduzir o ambiente visual local

Em client, executar `node --input-type=module -e "import {criarAmbiente} from './test/apoio/ambienteRelatorios.js'; const servidor = await criarAmbiente(); await servidor.listen();"` e abrir http://127.0.0.1:5175/verificacao. A opção `antes: true` carrega a versão HEAD do Git para comparação; `aba: 'financeiro'` inicia a aba financeira. O ambiente não chama serviços reais e não integra a aplicação publicada.
