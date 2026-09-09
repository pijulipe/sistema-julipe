# Implementação de Pedidos — proposta técnica local

Preparação autorizada pelo pedido de 07/09/2026. Não autoriza executar migração, políticas ou Storage no ambiente remoto. As decisões 07 e 08 continuam normativas.

## Persistência proposta

Manter `pedidos` e os registros legados. Acrescentar uma versão imutável com fotografia JSON de todos os campos comerciais, cliente, endereço, itens e composição dos combos. A fotografia tem contrato validado no backend; índices relacionais no pedido sustentam listagem por data/status/cliente. Valores em centavos inteiros, serializados como texto no contrato da fotografia, evitam arredondamentos binários. Histórico não consulta o catálogo para reconstruir preços e nomes.

Pagamentos e estornos são registros separados e imutáveis. Eventos registram autor e nome histórico, antes/depois, versão e data. Uma revisão de concorrência do pedido muda em toda mutação; a versão comercial muda apenas quando uma fotografia é efetivada. Pendências guardam proposta, impedimentos e assinatura do catálogo. Autorização do gerente é vinculada à assinatura exata da proposta e revisão; qualquer alteração exige nova aprovação.

Transações serializáveis, bloqueio do pedido e chave de idempotência por usuário/operação protegem reenvios, edições e estornos simultâneos. Reutilização de chave com outro corpo retorna 409. Conflito de revisão retorna 409 com instrução de recarregar, nunca sobrescreve silenciosamente.

## Catálogo e execução

Uma fila transacional no PostgreSQL recebe alterações de produtos, combos e composição por gatilhos. Consumidor no backend reavalia pedidos abertos e mantém a última fotografia válida diante de quantidade incompatível, total inválido ou falta de autorização. Exclusão conserva a fotografia do item e apenas sinaliza; inativação impede novas inclusões. O consumidor retoma após falhas. Conclusão e reabertura sincronizam o catálogo na mesma transação da ação para impedir corrida com a fila. Acesso de leitura não é o mecanismo de descoberta.

## Permissões e configuração

Cargos começam vazios. Concessões legadas permanecem; exceções explícitas prevalecem sobre cargo e concessões. Normalizar CLIENTE para CLIENTES somente na avaliação. Gerente permanece irrestrito; administração de funcionários conserva a matriz vigente. Limites individuais anuláveis prevalecem sobre cargo, com padrões 0% e R$ 0 e cancelamento padrão por perfil.

Expediente por dia da semana e capacidade por categoria são configurados pelo gerente. Fuso de negócio America/Sao_Paulo. Seleção a cada 15 minutos, incluindo o último horário do expediente como no frontend. Capacidade usa fotografia vigente, exclui entregues/cancelados e apenas avisa.

## Dinheiro

Preço do pacote R$ 20, múltiplo 25, quantidade 50: 2 pacotes, R$ 40 e capacidade 50. Combo mantém preço próprio; composição serve à capacidade.

Percentuais em centésimos de ponto percentual; cálculo inteiro arredonda metade para cima. Sobre R$ 200, 10% antes de R$ 20 = R$ 160; fixo antes do percentual = R$ 162. Percentual sobre R$ 0,05 a 10% arredonda R$ 0,005 para R$ 0,01. Comparação de limite por multiplicação inteira, sem arredondar o percentual efetivo para conceder acesso.

Financeiro soma confirmados e desconta estornos; rejeitados não contam. Acumulado estornado de cada pagamento deve respeitar saldo e limite do autor. Excedentes são preservados. Cancelamento não apaga lançamentos.

## Fotos e RLS propostas

Bucket privado `referencias-pedidos`, sem concessão genérica a authenticated; uploads assinados, caminhos gerados pelo backend, validação de assinatura dos bytes e tamanho após envio. Vincular objeto confirmado ao autor/item; leituras assinadas somente após autorização do pedido. Versões preservam referências; limpeza somente de uploads expirados não referenciados. Não armazenar Base64.

Novas tabelas internas: RLS habilitada sem políticas para anon/authenticated, acesso somente pela conexão backend autorizada. Revogar acesso direto às tabelas de negócio envolvidas requer revisão das políticas legadas e confirmação antes da execução remota. Nenhuma alteração de RLS remota está autorizada por esta proposta.

## Dados legados e recuperação

Não converter status PAGO/PARCIAL em lançamentos inventados. Não reconstruir endereço/composição histórica pelo cadastro atual. Preservar tabelas originais; registros sem fotografia permanecem identificados como legados, exigindo reconciliação explícita antes de operações novas. Migração deve ser transacional, precedida de backup e inventário de divergências. Nunca excluir registros antigos como estratégia de migração. Rollback de aplicação conserva tabelas novas e registros, sem reversão destrutiva.

## Contratos previstos

`/api/pedidos`: POST e GET paginado; `/:id`: GET e PUT; ações separadas `/status`, `/cancelamento`, `/reabertura`, `/pagamentos`, `/pagamentos/:pagamento/estornos`, `/autorizacao-desconto`, `/pendencia`, `/historico`, `/fotos`. Auxiliares de venda só consultam cadastros, não concedem CRUD. Indicadores globais calculados no servidor, nunca sobre uma página do cliente. Autorização do gerente usa sessão Supabase independente, sem senha nos endpoints de negócio.

## Estado

Proposta registrada antes da persistência. Implementação e evidências devem ser registradas separadamente; este documento não declara o módulo concluído.

## Contratos implementados e evidências

A implementação e os caminhos definitivos estão em `10_entrega_pedidos_2026-09-08.md`. O estorno utiliza `POST /:id/estornos`; a pendência é consultada no pedido e corrigida por `PUT /:id`. `/previa` permite revisar os valores sem gravar. A fila processa lotes de 50 pedidos com cursor persistido, incluindo itens presentes somente na proposta pendente. O estado ESTORNADO do lançamento é apresentado quando o estorno acumulado alcança o valor original; estornos parciais preservam CONFIRMADO e o saldo líquido.
