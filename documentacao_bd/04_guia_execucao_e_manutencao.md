# Guia de Execução, Implantação e Manutenção - Banco de Dados

**Projeto:** Sistema de Gerenciamento Operacional - Doceria Julipe  
**Arquivo SQL Principal:** [`schema.sql`](../schema.sql)  

---

## 1. Instruções de Implantação

### Pré-requisitos
- PostgreSQL v12 ou superior instalado.
- Ferramenta de gerenciamento (pgAdmin, DBeaver) ou cliente CLI (`psql`).

### Passo a Passo de Execução via Terminal CLI

```bash
# 1. Conectar ao PostgreSQL e criar o banco de dados
psql -U postgres -c "CREATE DATABASE doceria_julipe;"

# 2. Executar a carga do esquema completo
psql -U postgres -d doceria_julipe -f schema.sql
```

---

## 2. Exemplos de Consultas Analíticas (Conforme Requisitos do Documento de Visão)

### A. Relatório de Faturamento Mensal (Visão Sec. 5.6)
```sql
SELECT 
    TO_CHAR(data_pedido, 'YYYY-MM') AS mes,
    COUNT(id_pedido) AS total_pedidos,
    SUM(valor_subtotal) AS subtotal_vendas,
    SUM(valor_desconto) AS total_descontos,
    SUM(taxa_entrega) AS total_frete,
    SUM(valor_total) AS faturamento_liquido
FROM pedidos
WHERE status_pedido != 'CANCELADO' 
  AND deletado_em IS NULL
GROUP BY TO_CHAR(data_pedido, 'YYYY-MM')
ORDER BY mes DESC;
```

### B. Relatório de Produtos Mais Vendidos (Visão Sec. 5.6)
```sql
SELECT 
    pr.nome AS produto,
    c.nome_categoria AS categoria,
    SUM(pp.quantidade) AS quantidade_total_vendida,
    SUM(pp.subtotal) AS faturamento_produto
FROM propriedades_pedido pp
JOIN produtos pr ON pp.id_produto = pr.id_produto
JOIN categorias c ON pr.id_categoria = c.id_categoria
JOIN pedidos p ON pp.id_pedido = p.id_pedido
WHERE p.status_pedido != 'CANCELADO'
  AND p.deletado_em IS NULL
GROUP BY pr.nome, c.nome_categoria
ORDER BY quantidade_total_vendida DESC
LIMIT 10;
```

### C. Alerta de Estoque Crítico de Produtos Acabados (Visão Sec. 5.3)
```sql
SELECT 
    p.id_produto,
    p.nome AS produto,
    c.nome_categoria,
    p.estoque_atual,
    p.estoque_critico,
    (p.estoque_critico - p.estoque_atual) AS deficit
FROM produtos p
JOIN categorias c ON p.id_categoria = c.id_categoria
WHERE p.estoque_atual <= p.estoque_critico
  AND p.ativo = TRUE
  AND p.deletado_em IS NULL
ORDER BY p.estoque_atual ASC;
```

### D. Consulta de Clientes Aniversariantes do Mês (Visão Sec. 5.4)
```sql
SELECT 
    id_cliente,
    nome,
    telefone,
    data_aniversario,
    EXTRACT(DAY FROM data_aniversario) AS dia_aniversario
FROM clientes
WHERE EXTRACT(MONTH FROM data_aniversario) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND deletado_em IS NULL
ORDER BY dia_aniversario ASC;
```

---

## 3. Manutenção e Boas Práticas Operacionais

1. **Estratégia de Backup Diário (pg_dump)**:
   ```bash
   pg_dump -U postgres -F c -b -v -f "backup_julipe_$(date +%Y%m%d).dump" doceria_julipe
   ```
2. **Purga e Manutenção de Índices**:
   - Recomenda-se rodar `VACUUM ANALYZE;` semanalmente para atualizar as estatísticas do otimizador de consultas do PostgreSQL.
