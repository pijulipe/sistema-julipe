# Diagrama Entidade-Relacionamento (DER) - Doceria Julipe

**Projeto:** Sistema de Gerenciamento Operacional - Doceria Julipe  
**Formato:** Mermaid ER Diagram  

---

## 1. Visão Geral das Entidades e Cardinalidades

O modelo relacional do sistema organiza-se em torno da entidade central **`PEDIDOS`**, integrando:
- **Atendimento e Vendas**: `CLIENTES`, `USUARIOS`
- **Logística e Capacidade**: `LIMITES_HORARIO`, `ENTREGADORES`
- **Catálogo de Ofertas**: `CATEGORIAS`, `PRODUTOS`, `COMBOS`, `ITENS_COMBO`
- **Detalhamento do Pedido**: `PROPRIEDADES_PEDIDO` (Itens/Personalizações), `ACESSORIOS_PEDIDO` (`ACESSORIOS`)
- **Parâmetros de Sistema**: `CONFIGURACOES_SISTEMA`

---

## 2. Diagrama de Relacionamentos (Mermaid)

```mermaid
erDiagram
    CATEGORIAS ||--o{ PRODUTOS : "categoriza"
    PRODUTOS ||--o{ ITENS_COMBO : "compoe"
    COMBOS ||--o{ ITENS_COMBO : "contem"
    
    CLIENTES ||--o{ PEDIDOS : "solicita"
    USUARIOS ||--o{ PEDIDOS : "atende"
    LIMITES_HORARIO ||--o{ PEDIDOS : "reserva_slot"
    ENTREGADORES ||--o{ PEDIDOS : "entrega"
    
    PEDIDOS ||--o{ PROPRIEDADES_PEDIDO : "inclui_item"
    PRODUTOS ||--o| PROPRIEDADES_PEDIDO : "pode_ser"
    COMBOS ||--o| PROPRIEDADES_PEDIDO : "pode_ser"
    
    ACESSORIOS ||--o{ ACESSORIOS_PEDIDO : "pertence_a"
    PEDIDOS ||--o{ ACESSORIOS_PEDIDO : "contem_acessorio"

    CATEGORIAS {
        int id_categoria PK
        string nome_categoria
        int unidades_por_pacote_padrao
        boolean permite_imagem
    }

    PRODUTOS {
        int id_produto PK
        int id_categoria FK
        string nome
        decimal preco_unitario
        decimal estoque_atual
        decimal estoque_critico
    }

    COMBOS {
        int id_combo PK
        string nome
        decimal preco
        int versao
        boolean ativo
    }

    ITENS_COMBO {
        int id_item_combo PK
        int id_combo FK
        int id_produto FK
        decimal quantidade
    }

    CLIENTES {
        bigint id_cliente PK
        string nome
        string telefone
        string endereco
        string numero_endereco
    }

    USUARIOS {
        int id_usuario PK
        string nome
        string email
        enum perfil_acesso
    }

    LIMITES_HORARIO {
        int id_limite_horario PK
        date data
        timestamp horario_inicio
        timestamp horario_fim
        int limite_pedidos
    }

    ENTREGADORES {
        int id_entregador PK
        string nome
        string telefone
        string placa
    }

    PEDIDOS {
        bigint id_pedido PK
        bigint id_cliente FK
        int id_usuario_atendente FK
        int id_limite_horario FK
        int id_entregador FK
        enum tipo_entrega
        enum status_pedido
        enum status_pagamento
        enum peixe_status_cor
        boolean estoque_baixado
        decimal valor_total
    }

    PROPRIEDADES_PEDIDO {
        bigint id_item_pedido PK
        bigint id_pedido FK
        int id_produto FK
        int id_combo FK
        decimal quantidade
        decimal preco_unitario
        decimal subtotal
        string massa_escolhida
        string recheio_escolhido
    }

    ACESSORIOS {
        int id_acessorio PK
        string nome
        decimal preco_padrao
        int estoque_atual
    }

    ACESSORIOS_PEDIDO {
        int id_acessorio_pedido PK
        bigint id_pedido FK
        int id_acessorio FK
        int quantidade
        decimal preco_unitario
    }
```

---

## 3. Explicação das Regras de Integridade Referencial

1. **`PEDIDOS` $\rightarrow$ `PROPRIEDADES_PEDIDO` (`ON DELETE CASCADE`)**:
   - Se um pedido for apagado do sistema, todos os seus itens associados em `propriedades_pedido` serão automaticamente removidos para evitar registros órfãos.
2. **`PEDIDOS` $\rightarrow$ `CLIENTES` (`ON DELETE SET NULL`)**:
   - Se o cadastro de um cliente for removido fisicamente, a coluna `id_cliente` nos pedidos históricos desse cliente é definida como `NULL`, preservando os dados financeiros e o histórico de faturamento da doceria.
3. **`PRODUTOS` $\rightarrow$ `PROPRIEDADES_PEDIDO` (`ON DELETE RESTRICT`)**:
   - Impede a exclusão física de um produto do catálogo se ele já tiver sido vendido em algum pedido. Para tirar o produto de circulação, utiliza-se a exclusão lógica (*Soft Delete*) via `deletado_em` ou desativação via `ativo = FALSE`.
4. **Exclusividade Mutua de Itens (`CHECK`)**:
   - Em `propriedades_pedido`, garante-se que cada linha pertença **exclusivamente a um Produto individual ou a um Combo**, prevenindo inconsistências de dados na comanda da cozinha.
5. **Composição de combos (`UNIQUE` e `ON DELETE RESTRICT`)**:
   - O par (`id_combo`, `id_produto`) é único, impedindo o mesmo produto em duas linhas do combo. Produtos e combos não são removidos fisicamente enquanto houver composição ou referência histórica; o fluxo usa exclusão lógica.
6. **Nome vigente de combo (`UNIQUE INDEX` parcial e funcional)**:
   - `LOWER(TRIM(nome))` é único somente onde `item_ativo = TRUE` e `deletado_em IS NULL`, garantindo concorrência segura e permitindo reutilização após exclusão lógica.
