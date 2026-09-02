# Dicionário de Dados - Doceria Julipe

**SGBD:** PostgreSQL 12+  
**Projeto:** Sistema de Gerenciamento Operacional - Doceria Julipe  

---

## 📑 Sumário das Tabelas

1. [`categorias`](#1-tabela-categorias) - Categorias de produtos (ex: Bolos, Salgados, Doces)
2. [`clientes`](#2-tabela-clientes) - Cadastro de clientes e histórico de contatos
3. [`usuarios`](#3-tabela-usuarios) - Usuários do sistema e perfis de acesso
4. [`limites_horario`](#4-tabela-limites_horario) - Controle de capacidade de produção por horário
5. [`entregadores`](#5-tabela-entregadores) - Equipe de entrega e veículos
6. [`acessorios`](#6-tabela-acessorios) - Itens complementares (velas, embalagens especiais)
7. [`combos`](#7-tabela-combos) - Kits e combos promocionais
8. [`configuracoes_sistema`](#8-tabela-configuracoes_sistema) - Parâmetros globais do sistema
9. [`produtos`](#9-tabela-produtos) - Catálogo de produtos artesanais
10. [`itens_combo`](#10-tabela-itens_combo) - Composição dos combos (N:M)
11. [`pedidos`](#11-tabela-pedidos) - Registro principal das encomendas
12. [`propriedades_pedido`](#12-tabela-propriedades_pedido) - Itens pertencentes aos pedidos (Produtos ou Combos)
13. [`acessorios_pedido`](#13-tabela-acessorios_pedido) - Acessórios vinculados aos pedidos

---

### 1. Tabela `categorias`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_categoria` | `INT` | **NÃO** | `IDENTITY` | Chave primária da categoria. |
| `nome_categoria` | `VARCHAR(150)` | **NÃO** | - | Nome da categoria (ex: Salgados, Bolos). |
| `descricao` | `TEXT` | SIM | NULL | Detalhes adicionais da categoria. |
| `unidades_por_pacote_padrao` | `INT` | **NÃO** | `1` | Quantidade padrão por pacote (ex: 25 para salgados). |
| `permite_imagem` | `BOOLEAN` | **NÃO** | `FALSE` | Indica se os produtos desta categoria aceitam foto. |
| `ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Status de ativação no cardápio. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Controle operacional de integridade. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica (*Soft Delete*). |

---

### 2. Tabela `clientes`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_cliente` | `BIGINT` | **NÃO** | `IDENTITY` | Chave primária do cliente. |
| `nome` | `VARCHAR(255)` | **NÃO** | - | Nome completo do cliente. |
| `telefone` | `VARCHAR(20)` | **NÃO** | - | Telefone de contato (WhatsApp). |
| `endereco` | `VARCHAR(255)` | SIM | NULL | Nome da rua/avenida. |
| `numero_endereco` | `VARCHAR(20)` | SIM | NULL | Número do endereço. |
| `bairro` | `VARCHAR(100)` | SIM | NULL | Bairro para rota de entrega. |
| `ponto_referencia` | `VARCHAR(255)` | SIM | NULL | Ponto de referência logístico. |
| `observacoes` | `TEXT` | SIM | NULL | Preferências ou restrições alimentares. |
| `data_aniversario` | `DATE` | SIM | NULL | Data de nascimento (para promoções). |
| `data_cadastro` | `TIMESTAMP WITH TIME ZONE` | **NÃO** | `CURRENT_TIMESTAMP` | Data de registro no sistema. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag de registro ativo. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica (*Soft Delete*). |

---

### 3. Tabela `usuarios`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_usuario` | `INT` | **NÃO** | `IDENTITY` | Chave primária do usuário. |
| `nome` | `VARCHAR(255)` | **NÃO** | - | Nome do funcionário. |
| `email` | `VARCHAR(255)` | **NÃO** | - | E-mail de login (ÚNICO). |
| `senha_hash` | `VARCHAR(255)` | **NÃO** | - | Hash de senha de acesso. |
| `perfil_acesso` | `perfil_acesso_enum` | **NÃO** | - | Nível de permissão (`ADMINISTRADOR`, `GERENTE`, `ATENDENTE`). |
| `ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Indica se a conta está ativa. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag de registro ativo. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica (*Soft Delete*). |

---

### 4. Tabela `limites_horario`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_limite_horario` | `INT` | **NÃO** | `IDENTITY` | Chave primária da faixa de horário. |
| `data` | `DATE` | **NÃO** | - | Data da agenda. |
| `horario_inicio` | `TIMESTAMP WITH TIME ZONE` | **NÃO** | - | Início da janela de horário. |
| `horario_fim` | `TIMESTAMP WITH TIME ZONE` | **NÃO** | - | Fim da janela de horário. |
| `limite_pedidos` | `INT` | **NÃO** | `0` | Limite máximo aceito para o slot. |
| `pedidos_agendados` | `INT` | **NÃO** | `0` | Quantidade de pedidos já agendados. |
| `bloqueado` | `BOOLEAN` | **NÃO** | `FALSE` | Bloqueio manual da janela de horário. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag de registro ativo. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 5. Tabela `entregadores`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_entregador` | `INT` | **NÃO** | `IDENTITY` | Chave primária do entregador. |
| `nome` | `VARCHAR(255)` | **NÃO** | - | Nome do entregador/motorista. |
| `telefone` | `VARCHAR(20)` | SIM | NULL | Telefone celular do entregador. |
| `veiculo` | `VARCHAR(100)` | SIM | NULL | Modelo do veículo (ex: Moto, Carro). |
| `placa` | `VARCHAR(15)` | SIM | NULL | Placa do veículo. |
| `ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Disponibilidade do entregador. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag de registro ativo. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 6. Tabela `acessorios`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_acessorio` | `INT` | **NÃO** | `IDENTITY` | Chave primária do acessório. |
| `nome` | `VARCHAR(255)` | **NÃO** | - | Nome do item (ex: Vela Aniversário, Laço). |
| `preco_padrao` | `NUMERIC(10,2)` | **NÃO** | `0.00` | Preço de venda unitário. |
| `estoque_atual` | `INT` | **NÃO** | `0` | Saldo físico em estoque. |
| `ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Disponibilidade no sistema. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag de registro ativo. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 7. Tabela `combos`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_combo` | `INT` | **NÃO** | `IDENTITY` | Chave primária do combo. |
| `nome` | `VARCHAR(255)` | **NÃO** | - | Nome comercial; único entre registros não excluídos após `LOWER(TRIM(nome))`. |
| `descricao` | `TEXT` | SIM | NULL | Descrição dos itens inclusos. |
| `preco` | `NUMERIC(10,2)` | **NÃO** | - | Preço definido pelo usuário, maior ou igual a zero. |
| `versao` | `INT` | **NÃO** | `1` | Versão incrementada quando nome, preço ou composição mudam efetivamente. |
| `ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Status de exibição no cardápio. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag de registro ativo. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 8. Tabela `configuracoes_sistema`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_configuracao` | `INT` | **NÃO** | `IDENTITY` | Chave primária da configuração. |
| `chave` | `VARCHAR(100)` | **NÃO** | - | Identificador único (ex: `business_hours`). |
| `valor_json` | `JSONB` | **NÃO** | - | Conteúdo estruturado em JSON. |
| `descricao` | `TEXT` | SIM | NULL | Explicação do parâmetro. |
| `atualizado_em` | `TIMESTAMP WITH TIME ZONE` | **NÃO** | `CURRENT_TIMESTAMP` | Última modificação. |

---

### 9. Tabela `produtos`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_produto` | `INT` | **NÃO** | `IDENTITY` | Chave primária do produto. |
| `id_categoria` | `INT` | **NÃO** | - | FK para a tabela `categorias`. |
| `nome` | `VARCHAR(255)` | **NÃO** | - | Nome do produto. |
| `descricao` | `TEXT` | SIM | NULL | Descrição dos ingredientes ou sabor. |
| `preco_unitario` | `NUMERIC(10,2)` | **NÃO** | - | Preço de venda. |
| `unidade_medida` | `VARCHAR(20)` | **NÃO** | `'Unidade'` | Unidade (Unidade, Kg, Cento, etc.). |
| `multiplo_minimo` | `INT` | **NÃO** | `1` | Quantidade mínima de venda. |
| `tempo_preparo_minutos` | `INT` | **NÃO** | `0` | Tempo estimado de produção em min. |
| `url_imagem` | `TEXT` | SIM | NULL | Link para imagem de referência do produto. |
| `permite_imagem` | `BOOLEAN` | **NÃO** | `FALSE` | Habilita upload de foto customizada. |
| `estoque_atual` | `NUMERIC(10,2)` | **NÃO** | `0.00` | Saldo atual de produtos acabados. |
| `estoque_critico` | `NUMERIC(10,2)` | **NÃO** | `5.00` | Limite mínimo para disparar alerta. |
| `ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Status ativo no catálogo. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag operacional. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 10. Tabela `itens_combo`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_item_combo` | `INT` | **NÃO** | `IDENTITY` | Chave primária da associação. |
| `id_combo` | `INT` | **NÃO** | - | FK para a tabela `combos`. |
| `id_produto` | `INT` | **NÃO** | - | FK para a tabela `produtos`. |
| `quantidade` | `NUMERIC(10,3)` | **NÃO** | `1.000` | Quantidade do produto no combo. |

O par (`id_combo`, `id_produto`) é único. As duas chaves estrangeiras usam
`ON DELETE RESTRICT`; o fluxo da aplicação emprega exclusão lógica. A quantidade
deve ser positiva e o backend também valida o múltiplo mínimo vigente do produto.

---

### 11. Tabela `pedidos`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_pedido` | `BIGINT` | **NÃO** | `IDENTITY` | Chave primária do pedido. |
| `codigo_comanda` | `VARCHAR(50)` | SIM | NULL | Número da comanda física. |
| `id_cliente` | `BIGINT` | SIM | NULL | FK para o cliente solicitante. |
| `id_usuario_atendente` | `INT` | SIM | NULL | FK para o funcionário atendente. |
| `id_limite_horario` | `INT` | SIM | NULL | FK para o slot de agendamento. |
| `id_entregador` | `INT` | SIM | NULL | FK para o motorista alocado. |
| `tipo_entrega` | `tipo_entrega_enum` | **NÃO** | - | `ENTREGA`, `RETIRADA`, `CONSUMO_LOCAL`. |
| `data_pedido` | `TIMESTAMP WITH TIME ZONE` | **NÃO** | `CURRENT_TIMESTAMP` | Data/hora da criação. |
| `data_entrega_agendada` | `DATE` | SIM | NULL | Data prometida de entrega. |
| `horario_entrega_agendada` | `TIME` | SIM | NULL | Horário prometido de entrega. |
| `status_pedido` | `status_pedido_enum` | **NÃO** | `'RECEBIDO'` | Status operacional do pedido. |
| `status_pagamento` | `status_pagamento_enum` | **NÃO** | `'PENDENTE'` | Status financeiro. |
| `valor_subtotal` | `NUMERIC(10,2)` | **NÃO** | `0.00` | Soma dos itens do pedido. |
| `taxa_entrega` | `NUMERIC(10,2)` | **NÃO** | `0.00` | Valor do frete. |
| `desconto_percentual` | `NUMERIC(5,2)` | **NÃO** | `0.00` | Percentual de desconto concedido. |
| `valor_desconto` | `NUMERIC(10,2)` | **NÃO** | `0.00` | Valor em R$ do desconto. |
| `valor_total` | `NUMERIC(10,2)` | **NÃO** | `0.00` | Valor final a pagar. |
| `forma_pagamento` | `VARCHAR(100)` | SIM | NULL | Método (ex: PIX, Cartão, Dinheiro). |
| `peixe_status_cor` | `peixe_status_cor_enum` | **NÃO** | `'NENHUM'` | Sinalização visual Peixe Digital (`NEMO`, `DORI`, `NENHUM`). |
| `estoque_baixado` | `BOOLEAN` | **NÃO** | `FALSE` | Se o estoque físico já foi baixado. |
| `foto_referencia_url` | `TEXT` | SIM | NULL | Foto do bolo/decorado enviada pelo cliente. |
| `observacoes_pedido` | `TEXT` | SIM | NULL | Observações gerais do pedido. |
| `detalhes_personalizacao` | `TEXT` | SIM | NULL | Especificações técnicas de personalização. |
| `motivo_cancelamento` | `TEXT` | SIM | NULL | Justificativa em caso de cancelamento. |
| `cancelado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data/hora do cancelamento. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag operacional. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 12. Tabela `propriedades_pedido`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_item_pedido` | `BIGINT` | **NÃO** | `IDENTITY` | Chave primária do item do pedido. |
| `id_pedido` | `BIGINT` | **NÃO** | - | FK para o pedido pai. |
| `id_produto` | `INT` | SIM | NULL | FK para o produto (se item for produto). |
| `id_combo` | `INT` | SIM | NULL | FK para o combo (se item for combo). |
| `quantidade` | `NUMERIC(10,3)` | **NÃO** | - | Quantidade vendida (ex: 2.5 kg). |
| `preco_unitario` | `NUMERIC(10,2)` | **NÃO** | - | Preço praticado no momento da venda. |
| `subtotal` | `NUMERIC(10,2)` | **NÃO** | - | Total da linha (`quantidade * preco_unitario`). |
| `massa_escolhida` | `VARCHAR(100)` | SIM | NULL | Tipo de massa (para bolos). |
| `recheio_escolhido` | `VARCHAR(100)` | SIM | NULL | Sabor do recheio. |
| `cobertura_escolhida` | `VARCHAR(100)` | SIM | NULL | Tipo de cobertura (ex: Chantilly). |
| `escrita_personalizada` | `VARCHAR(255)` | SIM | NULL | Texto a ser escrito no bolo. |
| `observacoes_item` | `TEXT` | SIM | NULL | Especificações deste item. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag operacional. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |

---

### 13. Tabela `acessorios_pedido`

| Coluna | Tipo PostgreSQL | Nulo? | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id_acessorio_pedido` | `INT` | **NÃO** | `IDENTITY` | Chave primária da associação. |
| `id_pedido` | `BIGINT` | **NÃO** | - | FK para o pedido pai. |
| `id_acessorio` | `INT` | **NÃO** | - | FK para o acessório. |
| `quantidade` | `INT` | **NÃO** | `1` | Quantidade de velas/acessórios. |
| `preco_unitario` | `NUMERIC(10,2)` | **NÃO** | - | Preço cobrado por unidade. |
| `item_ativo` | `BOOLEAN` | **NÃO** | `TRUE` | Flag operacional. |
| `deletado_em` | `TIMESTAMP WITH TIME ZONE` | SIM | NULL | Data de exclusão lógica. |
