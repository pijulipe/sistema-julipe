/* ---------------------------------------------------------
   Utilitários de capacidade de produção.

   Um pedido pode ter itens de produto direto (id numérico) ou
   itens de combo (id no formato "combo-<id>"). Para saber quantos
   itens "reais" de cada categoria estão sendo pedidos numa hora,
   é preciso "decompor" os combos nos produtos que os compõem e
   aplicar o multiplicador unitsPerPackage de cada produto
   (ex: 1 pacote de salgados = 25 unidades reais).
--------------------------------------------------------- */

/** Extrai o "bucket" de hora (ex: "08:30" -> "08") usado para agrupar pedidos. */
export function getHourBucket(time) {
  return (time || "").slice(0, 2);
}

/**
 * Decompõe uma lista de itens de pedido (produtos e/ou combos) em
 * unidades reais por categoria.
 * items: [{ id, qty, ... }] — id numérico (produto) ou "combo-<id>"
 * Retorna: [{ category, units }]
 */
export function decomposeOrderItems(items, products, combos) {
  const result = [];

  (items || []).forEach((item) => {
    if (typeof item.id === "string" && item.id.startsWith("combo-")) {
      const comboId = Number(item.id.replace("combo-", ""));
      const combo = combos.find((c) => c.id === comboId);
      if (!combo) return;

      combo.items.forEach((ci) => {
        const product = products.find((p) => p.id === ci.productId);
        if (!product) return;
        const unitsPerPackage = product.unitsPerPackage || 1;
        result.push({
          category: product.category,
          units: ci.qty * item.qty * unitsPerPackage,
        });
      });
    } else {
      const product = products.find((p) => p.id === item.id);
      if (!product) return;
      const unitsPerPackage = product.unitsPerPackage || 1;
      result.push({
        category: product.category,
        units: item.qty * unitsPerPackage,
      });
    }
  });

  return result;
}

/** Soma uma lista decomposta em totais por categoria: { [category]: units } */
export function sumByCategory(decomposedList) {
  const totals = {};
  decomposedList.forEach(({ category, units }) => {
    totals[category] = (totals[category] || 0) + units;
  });
  return totals;
}

/**
 * Decompõe uma lista de itens de pedido (produtos e/ou combos) em
 * quantidades por produto (id numérico). Ao contrário de
 * decomposeOrderItems, aqui NÃO se aplica o multiplicador
 * unitsPerPackage — a quantidade fica na mesma unidade em que o
 * produto é vendido/estocado (a mesma usada em item.qty e em
 * StockContext), já que é isso que se compara ao estoque disponível.
 * items: [{ id, qty, ... }] — id numérico (produto) ou "combo-<id>"
 * Retorna: [{ productId, qty }]
 */
export function decomposeItemsByProduct(items, combos) {
  const result = [];

  (items || []).forEach((item) => {
    if (typeof item.id === "string" && item.id.startsWith("combo-")) {
      const comboId = Number(item.id.replace("combo-", ""));
      const combo = combos.find((c) => c.id === comboId);
      if (!combo) return;

      combo.items.forEach((ci) => {
        result.push({ productId: ci.productId, qty: ci.qty * item.qty });
      });
    } else {
      result.push({ productId: item.id, qty: item.qty });
    }
  });

  return result;
}

/** Soma uma lista decomposta em totais por produto: { [productId]: qty } */
export function sumByProduct(decomposedList) {
  const totals = {};
  decomposedList.forEach(({ productId, qty }) => {
    totals[productId] = (totals[productId] || 0) + qty;
  });
  return totals;
}

/**
 * Retorna os totais por categoria (em unidades reais) para uma data +
 * bucket de hora específicos, considerando os pedidos já existentes
 * mais uma lista opcional de itens extras (ex: o carrinho de um pedido
 * ainda não salvo).
 */
export function getCategoryTotalsForHour(
  orders,
  products,
  combos,
  dateISO,
  hourBucket,
  extraItems = []
) {
  const matching = orders.filter(
    (o) =>
      o.deliveryDate === dateISO &&
      getHourBucket(o.deliveryTime) === hourBucket &&
      o.status !== "entregue"
  );
  const allItems = [...matching.flatMap((o) => o.items), ...extraItems];
  return sumByCategory(decomposeOrderItems(allItems, products, combos));
}

/**
 * Compara totais por categoria com os limites configurados e retorna
 * a lista de categorias que estouraram o limite.
 * thresholds: { [category]: number | "" }
 * Retorna: [{ category, qty, threshold }]
 */
export function getExceededCategories(totals, thresholds) {
  const exceeded = [];
  Object.entries(totals).forEach(([category, qty]) => {
    const threshold = Number(thresholds?.[category]);
    if (threshold > 0 && qty > threshold) {
      exceeded.push({ category, qty, threshold });
    }
  });
  return exceeded;
}
