/** Quantidades representam unidades reais; fotografias preservam a composição vendida. */

/** Extrai o "bucket" de hora (ex: "08:30" -> "08") usado para agrupar pedidos. */
export function obterFaixaHora(time) {
  return (time || "").slice(0, 2);
}

/**
 * Decompõe uma lista de itens de pedido (produtos e/ou combos) em
 * unidades reais por categoria.
 * itens: [{ id, quantidade, ... }] — id numérico (produto) ou "combo-<id>"
 * Retorna: [{ categoria, unidades }]
 */
export function decomporItensPedido(itens, produtos, combos) {
  const result = [];

  (itens || []).forEach((item) => {
    if (item.composicao) {
      for (const componente of item.composicao) result.push({ categoria: componente.categoria || componente.idCategoria, unidades: componente.quantidade * item.quantidade });
      return;
    }
    if (typeof item.id === "string" && item.id.startsWith("combo-")) {
      const idCombo = Number(item.id.replace("combo-", ""));
      const combo = combos.find((c) => c.id === idCombo);
      if (!combo) return;

      combo.itens.forEach((ci) => {
        const produto = produtos.find((p) => p.id === ci.idProduto);
        if (!produto) return;
        result.push({
          categoria: produto.categoria,
          unidades: ci.quantidade * item.quantidade,
        });
      });
    } else {
      const produto = produtos.find((p) => p.id === item.id);
      if (!produto) return;
      result.push({
        categoria: produto.categoria,
        unidades: item.quantidade,
      });
    }
  });

  return result;
}

/** Soma uma lista decomposta em totais por categoria: { [categoria]: unidades } */
export function somarPorCategoria(decomposedList) {
  const totals = {};
  decomposedList.forEach(({ categoria, unidades }) => {
    totals[categoria] = (totals[categoria] || 0) + unidades;
  });
  return totals;
}

/**
 * Decompõe uma lista de itens de pedido (produtos e/ou combos) em
 * quantidades por produto (id numérico). Ao contrário de
 * decomporItensPedido, aqui NÃO se aplica o multiplicador
 * unidadesPorPacote — a quantidade fica na mesma unidade em que o
 * produto é vendido/estocado (a mesma usada em item.quantidade e em
 * EstoqueContext), já que é isso que se compara ao estoque disponível.
 * itens: [{ id, quantidade, ... }] — id numérico (produto) ou "combo-<id>"
 * Retorna: [{ idProduto, quantidade }]
 */
export function decomporItensPorProduto(itens, combos) {
  const result = [];

  (itens || []).forEach((item) => {
    if (item.composicao) {
      for (const componente of item.composicao) result.push({ idProduto: Number(componente.idProduto), quantidade: componente.quantidade * item.quantidade });
      return;
    }
    if (typeof item.id === "string" && item.id.startsWith("combo-")) {
      const idCombo = Number(item.id.replace("combo-", ""));
      const combo = combos.find((c) => c.id === idCombo);
      if (!combo) return;

      combo.itens.forEach((ci) => {
        result.push({ idProduto: ci.idProduto, quantidade: ci.quantidade * item.quantidade });
      });
    } else {
      result.push({ idProduto: item.id, quantidade: item.quantidade });
    }
  });

  return result;
}

/** Soma uma lista decomposta em totais por produto: { [idProduto]: quantidade } */
export function somarPorProduto(decomposedList) {
  const totals = {};
  decomposedList.forEach(({ idProduto, quantidade }) => {
    totals[idProduto] = (totals[idProduto] || 0) + quantidade;
  });
  return totals;
}

/**
 * Retorna os totais por categoria (em unidades reais) para uma data +
 * bucket de hora específicos, considerando os pedidos já existentes
 * mais uma lista opcional de itens extras (ex: o carrinho de um pedido
 * ainda não salvo).
 */
export function obterTotaisPorCategoriaHora(
  pedidos,
  produtos,
  combos,
  dateISO,
  faixaHora,
  itensExtras = []
) {
  const matching = pedidos.filter(
    (o) =>
      o.dataEntrega === dateISO &&
      obterFaixaHora(o.horarioEntrega) === faixaHora &&
      !["entregue", "cancelado"].includes(o.status)
  );
  const allItems = [...matching.flatMap((o) => o.itens), ...itensExtras];
  return somarPorCategoria(decomporItensPedido(allItems, produtos, combos));
}

/**
 * Compara totais por categoria com os limites configurados e retorna
 * a lista de categorias que estouraram o limite.
 * thresholds: { [categoria]: number | "" }
 * Retorna: [{ categoria, quantidade, threshold }]
 */
export function obterCategoriasExcedidas(totals, thresholds) {
  const exceeded = [];
  Object.entries(totals).forEach(([categoria, quantidade]) => {
    const threshold = Number(thresholds?.[categoria]);
    if (threshold > 0 && quantidade > threshold) {
      exceeded.push({ categoria, quantidade, threshold });
    }
  });
  return exceeded;
}
