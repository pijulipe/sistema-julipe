# Decisões confirmadas e impactos documentais — 03/09/2026

## Escopo e autoridade

Consolidação das respostas da doceria e das confirmações posteriores do usuário. A referência normativa completa é o [AGENTS.md](../AGENTS.md), nas seções de regras confirmadas. Este documento registra substituições e impactos no modelo, sem declarar funcionalidades como implementadas.

**Revisão exclusivamente documental:** nenhum SQL, schema Prisma, política RLS, dado, endpoint ou componente foi alterado. As estruturas mencionadas abaixo são necessidades de modelagem, não uma migração aprovada ou executada.

## Decisões finais que substituem respostas anteriores

| Tema | Decisão final |
| --- | --- |
| Perfis | Manter `ATENDENTE`, `ADMINISTRADOR` e `GERENTE`; funcionário/operador não é novo perfil. |
| Cargos | Começar sem cargos; gerente cria conjuntos de permissões. Cargo não substitui perfil. |
| Exceções | Individual concede ou retira permissão e prevalece sobre cargo; gerente é irrestrito. |
| Telas | `PEDIDOS`, `PRODUCAO`, `PRODUTO`, `COMBOS`, `RELATORIO`, `CLIENTE`, `ESTOQUE`, `EXPEDICAO`, `FUNCIONARIOS`. Produção e Expedição são independentes. Clientes usa atualmente `CLIENTES` no código/banco; compatibilidade ainda precisa de desenho técnico. |
| Início e Configurações | Início para todos os usuários internos ativos/autenticados; Configurações somente para gerente. Nenhum dos dois é módulo de permissão. |
| Cancelamento | Exige acesso a Pedidos e capacidade `podeCancelarPedido`. Atendente não pode por padrão; administrador pode por padrão; gerente sempre pode. Cargo/exceção individual ajusta a capacidade dos demais. Motivo opcional. |
| Status | `RECEBIDO`, `EM_PRODUCAO`, `PRONTO`, `EM_ROTA`, `ENTREGUE`, `CANCELADO`. Retirado é rótulo de entregue para retirada. Transições operacionais livres para usuários autorizados, respeitando cancelamento e reabertura. |
| Reabertura | Somente gerente reabre entregue, retirado ou cancelado, sempre para `EM_PRODUCAO`. |
| Auditoria | Identificador e nome histórico do usuário, data/hora, ação, campos anteriores/novos e motivo quando aplicável. Tela mostra nome. Registrar criação, edição, status, cancelamento, pagamentos, estornos e autorização de desconto. |
| Endereço | Um principal por cliente; pedido preserva endereço próprio sem atualizar cliente. Rua, número, bairro, complemento, referência, CEP, cidade e estado. |
| Pagamentos | Somente registro de informações, sem integração financeira. Débito, crédito e Pix, vários lançamentos/formas/datas por pedido. |
| Situação financeira | Lançamentos `CONFIRMADO`, `REJEITADO`, `ESTORNADO`; pedido `PENDENTE`, `PARCIAL`, `PAGO`, considerando valores líquidos de estornos. Rejeição não conta como pagamento. |
| Estornos | Totais ou parciais, manuais; gerente configura limite por cargo com substituição individual. Não são exclusivos de gerente. Ninguém devolve mais que o valor confirmado ainda não estornado. |
| Cancelamento e dinheiro | Não apaga nem estorna automaticamente pagamentos; sinaliza necessidade de estorno manual. |
| Excedente | Registrar todo valor pago; valor igual/superior ao total deixa pago. Não converter automaticamente excedente em crédito ou troco. |
| Relatórios | Separar faturamento do pedido, recebimentos, estornos e excedente. Cancelados permanecem visíveis, sem compor faturamento. |
| Desconto | Percentual, fixo ou ambos; ordem escolhida e preservada. Motivo opcional. Limite efetivo percentual sobre subtotal, por cargo com substituição individual. Excesso exige gerente com própria conta, apenas para aquele pedido, com auditoria. |
| Capacidade | Unidades reais por categoria e hora agendada, limites globais por categoria iguais entre dias/horários. Sem peso por complexidade; combos decompostos sem duplicar unidades. |
| Excesso de capacidade | Apenas aviso para todos, sem bloqueio/autorização especial. Substitui a antiga regra de rejeição de intervalo lotado. |
| Horários | Funcionamento por dia da semana, seleção a cada 15 minutos, agrupamento de capacidade por hora. Cancelados e concluídos deixam a contagem. |

As regras existentes de administração de funcionários (quem cadastra cada perfil, quem pode editar quem e imutabilidade de gerente) permanecem. Acesso a uma tela não substitui essas restrições.

## Exemplos de cálculo confirmados

- Pedido de R$ 100, recebimento confirmado de R$ 110: `PAGO`, R$ 100 de faturamento, R$ 110 recebidos e R$ 10 de excedente.
- Pedido de R$ 100: tentativa de débito rejeitada seguida de Pix confirmado de R$ 100 resulta em `PAGO`; a tentativa rejeitada permanece identificável.
- Estorno parcial desconta apenas o valor efetivamente devolvido, preservando o restante como recebido. Cancelamento operacional e situação financeira são informações distintas.
- Subtotal de R$ 200: 10% e depois R$ 20 resulta em R$ 160; R$ 20 e depois 10% resulta em R$ 162. Descontos efetivos de 20% e 19%, respectivamente, para comparação com o limite. Preservar a ordem escolhida.

## Impactos no banco — a propor, não implementados

| Necessidade | Limitação da estrutura existente | Trabalho de modelagem posterior |
| --- | --- | --- |
| Auditoria por ação | `id_usuario_atendente` e campos de cancelamento não representam histórico de todas as ações. | Propor registros vinculados ao pedido, autor histórico, data, ação e alterações. Tabela de auditoria e uso de JSON para diferenças são possibilidades, não decisões físicas aprovadas. |
| Cargos e exceções | Permissões individuais atuais só representam concessões simples. | Propor cargos, permissões herdadas, exceções positivas/negativas, capacidade de cancelamento e limites; preservar a matriz administrativa existente. |
| Pagamentos/estornos | Pedido guarda uma forma textual e um status, sem múltiplos recebimentos. | Propor lançamentos, registros de estorno parcial/total e cálculo líquido; não substituir pagamento inteiro por estorno parcial. |
| Endereço histórico | Pedido não guarda endereço de venda; cliente não contém todos os campos confirmados. | Propor fotografia estruturada vinculada ao pedido. Tabela separada ou colunas será escolha da proposta; não pressupor expansão do cadastro de cliente além do aprovado. |
| Descontos | Campos existentes não guardam escolha da ordem nem autorização/limite histórico. | Propor ordem, componentes, desconto efetivo e autorização auditável. |
| Capacidade | `limites_horario` representa limite de pedidos por intervalo/data. | Propor persistência de limites globais por categoria e cálculo por data/hora, sem bloqueio por lotação. Não alterar RLS nesta revisão. |
| História dos combos | Cadastro versionado existe, mas fotografia da venda ainda não. | Projetar com Pedidos nome, preço, versão, produtos e quantidades vendidos, preservando histórico. |

Uma proposta futura deverá apresentar problema, solução, alternativas, impactos, compatibilidade, migração e testes antes de executar alterações. O dicionário e o diagrama atuais não devem mostrar tabelas futuras como existentes.

## Itens a explicitar na proposta técnica

- Compatibilidade da chave `CLIENTE`/`CLIENTES`, sem criar duas permissões para a mesma tela.
- Valores iniciais para funcionários sem cargo, limites e unidade/escopo do limite de estorno; não presumir concessão ilimitada na ausência de configuração.
- Arredondamento, subtotal zero, atualização de pedido com pagamentos já registrados e representação de estornos parciais. Se uma alternativa mudar regra de negócio, apresentar para confirmação antes de implementá-la.
- Preservação de dados legados, histórico de preços/combos e contratos de edição das permissões herdadas.
- Evento obrigatório de autorização de capacidade não se aplica: a decisão final libera continuação após aviso. Auditoria normal de criação/edição permanece.

## Pendências de negócio preservadas

Continuam pendentes apenas no escopo de estoque: momento da baixa, devolução de estoque ao cancelar, controle de produtos/ingredientes e eventual controle de ingredientes. A liberação de capacidade ao cancelar não confirma devolução de estoque.

A regra anterior de fotos de referência (até 10 itens com foto por pedido) continua válida, sem implementação nesta etapa.
