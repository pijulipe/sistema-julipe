# Relatório de Análise de Sistemas - Banco de Dados Doceria Julipe

**Autor:** Analista de Sistemas Senior  
**Projeto:** Sistema de Gerenciamento Operacional - Doceria Julipe  
**Data:** 29 de Julho de 2026  

> **Nota de atualização — 03/09/2026:** este relatório é histórico e descreve a análise daquela data. As regras vigentes estão no [AGENTS.md](../AGENTS.md) e na [consolidação de decisões](07_decisoes_confirmadas_2026-09-03.md). Inferências antigas baseadas no protótipo não substituem essas confirmações. Nenhuma nova estrutura foi implementada nesta atualização documental.

---

## 1. Contexto e Objetivo

Este relatório documenta a análise técnica realizada sobre a estrutura de banco de dados da **Doceria Julipe**, confrontando a modelagem ER inicial (fornecida nas imagens) com os requisitos descritos no **Documento de Visão** (`PI_documento_de_visão_DoceriaJulipe (1).pdf`) e o comportamento das regras de negócio implementadas na **Aplicação Web Frontend** (disponível na pasta `Projeto`).

O objetivo foi identificar lacunas de dados, inconsistências nos fluxos operacionais e evoluir a arquitetura do banco de dados PostgreSQL para suportar com total fidelidade todas as funcionalidades do sistema.

---

## 2. Diagnóstico das Lacunas e Inconsistências Identificadas

| Componente | Estado no Diagrama Inicial | Requisito Real (Visão / Frontend) | Correção Efetuada no Banco de Dados |
| :--- | :--- | :--- | :--- |
| **Combos / Kits** | Ausente na modelagem. | O frontend possui o módulo `CombosPanel.jsx` e `CombosContext.jsx` para agrupamento de produtos com preço promocional fixo. | Criadas as tabelas `combos` e `itens_combo` (N:M). |
| **Itens do Pedido** | Apenas produtos simples em `PROPRIEDADES_PEDIDO`. | Um item de pedido pode ser um **Produto** individual ou um **Combo**. | Adicionada coluna `id_combo` em `propriedades_pedido` com restrição `CHECK` mutua exclusão (`id_produto` OU `id_combo`). |
| **Status do Pedido** | Estados genéricos no `enum`. | Fluxo operacional do frontend (`OrdersContext.jsx`): `RECEBIDO` $\rightarrow$ `EM_PRODUCAO` $\rightarrow$ `PRONTO` $\rightarrow$ `EM_ROTA` (para entregas) $\rightarrow$ `ENTREGUE` ou `CANCELADO`. | Enum `status_pedido_enum` atualizado com exatamente estes 6 estados. |
| **Status Peixe Digital** | Não especificado ou genérico. | Ícones visuais de acompanhamento na cozinha (`NEMO`, `DORI`, e padrão `NENHUM`). | Enum `peixe_status_cor_enum` configurado como `'NEMO'`, `'DORI'`, `'NENHUM'` (DEFAULT `'NENHUM'`). |
| **Desconto & Cancelamento** | Apenas `valor_desconto` genérico. | O frontend calcula `discountPercent` (porcentagem de desconto) e armazena motivo/data de cancelamento. | Adicionadas colunas `desconto_percentual`, `motivo_cancelamento` e `cancelado_em` na tabela `pedidos`. |
| **Baixa Automática de Estoque** | Não rastreada por pedido. | No frontend (`SettingsContext.jsx`), existe o parâmetro `autoDeductStock` e cada pedido grava a flag `stockDeducted` para não abater estoques duplicados. | Adicionada coluna `estoque_baixado BOOLEAN DEFAULT FALSE` na tabela `pedidos`. |
| **Endereço do Cliente** | Campo único de `endereco`. | O modal de cliente (`ClientModal.jsx`) separa logradouro de número do endereço. | Adicionada coluna `numero_endereco VARCHAR(20)` na tabela `clientes`. |
| **Imagem & Estoque Crítico** | Ausente em produtos. | O frontend suporta uploads/links de fotos de produtos (`allowsImage`) e limites de alerta de estoque mínimo (`criticalThreshold`). | Adicionados campos `url_imagem`, `permite_imagem`, `estoque_atual` e `estoque_critico` em `produtos`. |
| **Configurações do Sistema** | Inexistente no banco de dados. | Horários agendáveis por dia da semana e alertas de capacidade da cozinha por hora. | Criada a tabela `configuracoes_sistema` com armazenamento flexível via `JSONB`. |

---

## 3. Impacto da Refatoração na Operação

1. **Garantia de Não-Ruptura no Frontend**: A API e o backend que consumirem o banco PostgreSQL atualizado terão um mapeamento 1:1 com os estados do React (`useState` / `useContext`), evitando necessidade de transformações complexas de dados na camada de aplicação.
2. **Integridade Referencial Forte**: Com a introdução do `CHECK (id_produto IS NOT NULL AND id_combo IS NULL OR ...)` na tabela de itens do pedido, o banco de dados proíbe a inserção de registros inválidos no nível do motor relacional.
3. **Escalabilidade com Índices Parciais**: O uso de `WHERE deletado_em IS NULL` garante que à medida que o histórico de vendas cresça, as consultas do dia a dia continuem extremamente rápidas.

---

## 4. Conclusão

A análise histórica contribuiu para a estrutura existente, mas não comprova atendimento integral às regras confirmadas posteriormente. Auditoria, cargos/exceções, pagamentos múltiplos, estornos, endereço histórico e demais impactos listados na consolidação de 03/09/2026 ainda exigem proposta de modelagem e implementação.
