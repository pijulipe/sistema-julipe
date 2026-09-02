-- Diagnóstico somente leitura antes da integração do módulo de Combos
-- Data: 2026-09-02
-- Este script não altera dados nem estrutura do banco.

-- 1. Estrutura atualmente existente nas tabelas envolvidas.
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('combos', 'itens_combo', 'propriedades_pedido')
ORDER BY table_name, ordinal_position;

-- 2. Nomes de combos vigentes que colidem após LOWER(TRIM(nome)).
-- Resultado esperado: nenhuma linha.
SELECT
  LOWER(TRIM(nome)) AS nome_normalizado,
  COUNT(*) AS quantidade,
  ARRAY_AGG(id_combo ORDER BY id_combo) AS ids_combos
FROM public.combos
WHERE item_ativo = TRUE
  AND deletado_em IS NULL
GROUP BY LOWER(TRIM(nome))
HAVING COUNT(*) > 1;

-- 3. Produto repetido dentro do mesmo combo.
-- Resultado esperado: nenhuma linha.
SELECT
  id_combo,
  id_produto,
  COUNT(*) AS quantidade_linhas,
  ARRAY_AGG(id_item_combo ORDER BY id_item_combo) AS ids_itens
FROM public.itens_combo
GROUP BY id_combo, id_produto
HAVING COUNT(*) > 1;

-- 4. Combos sem nenhum produto.
-- Não impede o DDL, mas precisa ser corrigido antes de usar a API.
-- Resultado esperado: nenhuma linha.
SELECT c.id_combo, c.nome, c.ativo
FROM public.combos c
LEFT JOIN public.itens_combo ic ON ic.id_combo = c.id_combo
WHERE c.item_ativo = TRUE
  AND c.deletado_em IS NULL
GROUP BY c.id_combo, c.nome, c.ativo
HAVING COUNT(ic.id_item_combo) = 0;

-- 5. Composição com produto inexistente, inativo ou excluído.
-- Resultado esperado: nenhuma linha para combos ativos.
SELECT
  c.id_combo,
  c.nome AS nome_combo,
  ic.id_item_combo,
  ic.id_produto,
  p.nome AS nome_produto,
  p.ativo AS produto_ativo,
  p.item_ativo AS produto_item_ativo,
  p.deletado_em AS produto_deletado_em
FROM public.combos c
JOIN public.itens_combo ic ON ic.id_combo = c.id_combo
LEFT JOIN public.produtos p ON p.id_produto = ic.id_produto
WHERE c.item_ativo = TRUE
  AND c.deletado_em IS NULL
  AND c.ativo = TRUE
  AND (
    p.id_produto IS NULL
    OR p.ativo = FALSE
    OR p.item_ativo = FALSE
    OR p.deletado_em IS NOT NULL
  );

-- 6. Quantidade inválida ou incompatível com o múltiplo mínimo vigente.
-- Resultado esperado: nenhuma linha.
SELECT
  ic.id_item_combo,
  ic.id_combo,
  ic.id_produto,
  ic.quantidade,
  p.multiplo_minimo
FROM public.itens_combo ic
JOIN public.produtos p ON p.id_produto = ic.id_produto
WHERE ic.quantidade <= 0
   OR p.multiplo_minimo <= 0
   OR MOD(ic.quantidade, p.multiplo_minimo) <> 0;

-- 7. Item de pedido com origem inválida: ambos ou nenhum preenchido.
-- Resultado esperado: nenhuma linha.
SELECT id_item_pedido, id_pedido, id_produto, id_combo
FROM public.propriedades_pedido
WHERE (id_produto IS NULL AND id_combo IS NULL)
   OR (id_produto IS NOT NULL AND id_combo IS NOT NULL);

-- 8. Resumo numérico dos bloqueios principais.
-- Todos os valores devem ser zero antes de aplicar o script estrutural.
SELECT
  (
    SELECT COUNT(*)
    FROM (
      SELECT 1
      FROM public.combos
      WHERE item_ativo = TRUE AND deletado_em IS NULL
      GROUP BY LOWER(TRIM(nome))
      HAVING COUNT(*) > 1
    ) nomes_duplicados
  ) AS grupos_nomes_duplicados,
  (
    SELECT COUNT(*)
    FROM (
      SELECT 1
      FROM public.itens_combo
      GROUP BY id_combo, id_produto
      HAVING COUNT(*) > 1
    ) produtos_repetidos
  ) AS grupos_produtos_repetidos,
  (
    SELECT COUNT(*)
    FROM public.propriedades_pedido
    WHERE (id_produto IS NULL AND id_combo IS NULL)
       OR (id_produto IS NOT NULL AND id_combo IS NOT NULL)
  ) AS itens_pedido_origem_invalida;
