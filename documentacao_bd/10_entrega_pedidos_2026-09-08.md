# Pedidos — entrega local em 08/09/2026

## Implementado

- API em camadas, validação Zod, autenticação e recarga de acesso, criação, prévia de valores, listagem paginada, consulta e edição.
- Revisão concorrente, operações idempotentes, transações serializáveis e bloqueios para edição e estornos. A interface conserva a chave para repetir uma requisição com falha e impede envio simultâneo.
- Fotografias comerciais e versões históricas: cliente, endereço da venda, composição, preço por pacote, quantidade, descontos e ordem. Eventos preservam nome do responsável e alterações anteriores/novas.
- Fila persistida por gatilhos de produto, combo e composição; lotes de 50 pedidos, com cursor e retomada. Pedidos concluídos preservam a fotografia; abertos recebem atualização ou pendência, mantendo a versão válida até correção/autorização. Nenhuma baixa de estoque é realizada.
- Pagamentos múltiplos em débito, crédito e Pix, rejeições, parcial, excedente e estornos acumulados. Cancelamento conserva recebimentos; reabertura exclusiva do gerente volta à produção.
- Desconto em centavos, duas ordens, arredondamento de metade para cima e limite efetivo. Autorização inicial expira em dez minutos e vincula solicitante, proposta e chave. A sessão do gerente é independente da sessão do operador.
- Cargos, exceções positivas/negativas, limites individuais, expediente por dia da semana e capacidade por categoria. Gerente configura; a administração existente conserva suas restrições por perfil.
- Fotos por item, até dez por pedido, bucket privado, upload temporário, confirmação por autor, assinatura de bytes/tamanho, leitura temporária e retenção das referências históricas. A limpeza revalida referências dentro de transação.
- Formulários, confirmação de valores, pagamentos, estornos, pendências, histórico paginado e consulta de versões/fotos. Menus refletem permissões atuais. Produção, Expedição, Início e relatórios consomem os mesmos pedidos persistidos; indicadores financeiros globais usam a API.

## Arquivos principais

- `server/src/services/pedidoService.js`, `calculoPedido.js`, `fotoPedidoService.js`, `configuracaoPedidoService.js`.
- `server/src/repositories/pedidoRepository.js` e demais repositórios específicos; controllers, routes e validators correspondentes.
- `server/prisma/schema.prisma`.
- `client/src/PedidosContext.jsx`, `FormularioPedido.jsx`, `DetalhesPedido.jsx`, `PedidosPanel.jsx`, `ConfiguracaoPedidosPanel.jsx`, `ValoresHistoricoPedido.jsx`.
- `server/integracao/pedidos.js`: testes de PostgreSQL e API isolados. `ambienteVisual.js`: ambiente descartável com contas fictícias, exclusivamente local.

## Banco e ativação

**Nenhum SQL, política, bucket ou deploy foi aplicado ao Supabase/ambiente remoto.**

Para banco existente, os arquivos `sql/2026-09-07_pedidos.sql` e `sql/2026-09-07_pedidos_restricoes.sql` devem ser executados nesta ordem, dentro de uma única transação, após backup e conferência da estrutura real. Não executar o arquivo de criação em banco existente. Não usar `prisma db push` como substituto: ele não representa os gatilhos, checks e a fila.

Para banco vazio, `sql/2026-09-08_criacao_completa.sql` cria as tabelas de negócio e os complementos de Pedidos. É uma cópia versionável do `schema.sql` local, que já era ignorado pelo Git. O arquivo de contexto antigo com `USER-DEFINED` foi substituído localmente por tipos SQL explícitos. A infraestrutura Supabase Auth/Storage e a sincronização de usuários continuam seguindo os scripts específicos já documentados no projeto.

`sql/2026-09-07_pedidos_rls_proposta.sql` é a proposta separada de restrição de acesso direto e criação/configuração do bucket `referencias-pedidos`. Exige aprovação antes da execução remota e revisão das políticas Storage existentes. O backend precisa de conexão autorizada às tabelas internas. Não conceder acesso genérico a essas tabelas ou ao bucket para resolver erro de permissão.

Depois da migração aprovada: gerar Prisma Client, disponibilizar backend e frontend compatíveis e configurar o expediente pelo gerente antes do primeiro agendamento. Cargos e limites começam sem cadastros inferidos do protótipo. A API em execução inicia a fila a cada cinco segundos e a limpeza de fotos a cada hora. A fila não depende da abertura de telas.

Variáveis existentes necessárias: backend `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORTA`, `ORIGENS_PERMITIDAS`, `NODE_ENV`; frontend `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Nenhum segredo novo é exigido.

## Verificação

- Testes gerais do backend: 127 passaram, incluindo regressões de autenticação, clientes, funcionários, produtos e combos e testes de dinheiro/fotos/permissões.
- Integração com PostgreSQL descartável: 19 testes passaram (18 cenários e o agrupamento principal). Cobertura: migração com registro legado, persistência, endereço histórico, concorrência, idempotência, catálogo, pendências, aprovação, cancelamento, reabertura, estorno integral, criação em banco vazio e endpoints com revogação real de acesso.
- Prisma validado; build de produção do frontend concluído; lint sem erros. Permanecem avisos de Fast Refresh, dependência de hook no formulário de funcionários e tamanho do pacote JavaScript principal.
- Verificação visual em ambiente local fictício: 50 unidades por R$ 40, pagamento de R$ 45 com excedente de R$ 5, estorno de R$ 10 com situação PARCIAL, histórico e persistência após recarregar.
- Dependência adicional apenas de desenvolvimento: `embedded-postgres`, para testes isolados. Não aponta para a URL de banco real. O primeiro preparo pode exigir download do binário PostgreSQL.

Comandos usuais: em `server`, `npm test`, `npm run test:pedidos`, `npm run prisma:validar`; em `client`, `npm run build` e `npm run lint`. Nesta máquina o atalho global do npm estava quebrado na retomada; os mesmos executáveis locais foram invocados diretamente com Node.

## Limites e trabalho de ativação restante

- Registros legados permanecem intactos e sinalizados; não são convertidos em pagamentos, endereços ou composições inventados. Não há assistente de reconciliação desses registros. É necessário inventariá-los e definir sua reconciliação explícita antes de novas operações sobre eles. Indicadores informam quantos legados ficaram fora dos cálculos financeiros.
- Upload/leitura de fotos foram verificados com dependências substitutas, sem chamar Storage remoto. A validação com o bucket real depende da configuração aprovada. Validação de bytes reconhece assinatura de formato e limite de tamanho; não é serviço de análise antivírus.
- `/painel` fornece a coleção completa para compatibilidade dos consumidores existentes, em uma leitura consistente; não usa a página da tabela para calcular totais. Para volume elevado, deve evoluir para consultas específicas de Produção/Expedição e agregações no banco. A listagem administrativa de Pedidos e o histórico já são paginados.
- Estoque e funcionalidades não relacionadas dos demais módulos continuam no escopo anterior. Não há processamento financeiro externo, estorno bancário automático ou implantação remota nesta entrega.

Os itens de ativação remota não estão autorizados pelo pedido de implementação local. Esta entrega permite revisar os arquivos concretos antes dessa aprovação.

## Recuperação do visual original — 08/09/2026

A pedido do usuário, o commit `cde089d` foi usado como referência visual: lista de pedidos em linhas com etiquetas, navegação diária, histórico, cadastro em quatro etapas com resumo lateral e edição em modal compacto. Novos campos, revisão de valores, pagamentos, estornos, versões e permissões permanecem integrados à API. Os controles adicionais seguem o padrão azul/slate original. A lista pagina os pedidos completos já fornecidos pelo contexto persistido; totais diários são calculados sobre a coleção inteira, excluindo cancelados do faturamento.

Verificação visual com banco local descartável: criação, edição de 25 para 50 unidades, revisão do total de R$ 40 e registro do pagamento com situação PAGO. Nenhuma mudança de backend, migração ou banco remoto foi necessária para esta recuperação visual.
