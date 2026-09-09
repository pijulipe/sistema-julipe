# Decisões de Pedidos — 07/09/2026

Revisão exclusivamente documental das respostas do usuário. Nenhum código, SQL, Prisma, banco ou política de acesso foi alterado. Complementa e, nos pontos abaixo, substitui as decisões de 03/09/2026. Referência normativa: [AGENTS.md](../AGENTS.md).

## Decisões confirmadas

| Tema | Regra |
| --- | --- |
| Edição | Todos os campos de negócio podem ser editados. Concluídos e cancelados precisam ser reabertos pelo gerente antes da edição. Histórico e pagamentos não podem ser apagados por essa edição. |
| Atualização cadastral | Pedidos abertos acompanham novos preços, múltiplos e composição de combos, recalculando o total inclusive com pagamentos registrados. |
| Quantidade incompatível | Se o novo múltiplo mínimo invalidar a quantidade de um pedido aberto, o funcionário deve escolher uma quantidade válida antes de efetivar a atualização. Nunca aumentar ou reduzir automaticamente. Concluídos preservam as quantidades históricas. |
| Conclusão e reabertura | Conclusão preserva a última versão do pedido. Reabertura aplica e salva mudanças existentes, preservando o histórico. Substitui a regra de imutabilidade dos combos para todos os pedidos antigos. |
| Inativação | Sinalizar alteração de produto/combo utilizado, mantendo o pedido aberto. Não concede permissão para adicionar novos itens inativos. |
| Exclusão | Manter o produto/combo nos pedidos que já o utilizam e sinalizar inconsistência, indicando que o cadastro foi excluído. Não remover a linha nem recalcular o total apenas pela exclusão. Não disponibilizar para novas inclusões e preservar histórico de concluídos. |
| Recálculo com total inválido | Se o total calculado for zero ou negativo, bloquear a efetivação, sinalizar o problema e exigir ajuste dos itens ou desconto. Manter a última versão válida até a correção, respeitando a autorização de desconto quando necessária. |
| Desconto | Limite inicial de não gerentes sem configuração: 0%. Desconto efetivo inferior a 100%; pedido não pode ficar gratuito. Alteração que continue acima do limite exige nova autorização do gerente antes de efetivar. |
| Estorno | Limite inicial de não gerentes sem configuração: R$ 0. Limite em reais, acumulado por pagamento, sem contorno por estornos fracionados. Mantida a exceção administrativa do gerente e o teto do valor recebido disponível. |
| Correção de pagamento | Estorno e novo lançamento, preservando lançamento original e auditoria. |
| Total e centavos | Pedido com itens e total maior que zero. Arredondamento monetário para duas casas decimais aprovado, substituindo a orientação inicial de não arredondar. |
| Agendamento | Não permitir datas passadas nem horários fora do expediente. |
| Entrega | Rua, número, bairro e cidade obrigatórios. Taxa de entrega e entregador fora desta versão. |
| Consulta em Pedidos | Pesquisar clientes e catálogo para a venda sem exigir acesso administrativo aos respectivos módulos. |
| Produção e Expedição | Visualizar os dados e executar as mudanças operacionais disponíveis na respectiva tela. Produção: colocar em produção, marcar pronto e voltar para recebido. Expedição: marcar saída, confirmar entrega/retirada e retornar etapas operacionais. Cancelamento exige acesso a Pedidos e capacidade específica; reabertura permanece exclusiva do gerente para `EM_PRODUCAO`. |
| Falta de autorização | Exibir “Sem autorização. Consulte o gerente.” e bloquear a efetivação até a aprovação. |
| Escopo | Fotos de referência incluídas, uma por item e até 10 itens com foto por pedido. Estoque automático fora. |
| Fotos de referência | Formatos PNG, JPG/JPEG e WebP, com tamanho máximo de 5 MB por foto. |

## Pontos para a proposta de implementação

- Definir etapa e critério exatos de arredondamento com exemplos, usando representação monetária precisa.
- Conciliar recálculo automático com bloqueio de efetivação enquanto faltar nova autorização de desconto. Não supor que atualização cadastral contorna essa exigência.
- Aplicar a escolha manual de quantidade válida, a sinalização de item excluído sem removê-lo e o bloqueio de atualização com total inválido, conforme decisões confirmadas acima.
- Mapear as ações operacionais confirmadas de Produção/Expedição para os contratos da API, validando permissões no backend e preservando as exceções de cancelamento e reabertura.
- Propor armazenamento e acesso das fotos de referência, respeitando PNG, JPG/JPEG, WebP e máximo de 5 MB por foto.
- Propor contratos, auditoria de recálculo, persistência histórica, proteção contra duplicação e edições simultâneas, migração e testes. Estrutura física permanece não aprovada para execução.

As demais regras confirmadas continuam válidas, incluindo preservação dos pagamentos, excedentes, capacidade somente com aviso e reabertura exclusiva do gerente para `EM_PRODUCAO`.
