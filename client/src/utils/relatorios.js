// Apenas agrega valores históricos; regras de pagamento e desconto pertencem à API.
export const emReais = (centavos) => Number(centavos) / 100;
export const vendaValida = (pedido) => !!pedido.fotografia && pedido.status !== "cancelado";

export function itensVendidos(pedido) {
  if (!vendaValida(pedido)) return [];
  const foto = pedido.fotografia;
  const subtotal = BigInt(foto.subtotalCentavos);
  if (subtotal <= 0n) return [];
  // Arredondamento acumulado conserva exatamente o total, inclusive centavos residuais.
  let baseAcumulada = 0n;
  let valorAnterior = 0n;
  return foto.itens.map((item) => {
    baseAcumulada += BigInt(item.subtotalCentavos);
    const acumulado = (baseAcumulada * BigInt(foto.totalCentavos) + subtotal / 2n) / subtotal;
    const centavos = acumulado - valorAnterior;
    valorAnterior = acumulado;
    return { id: `${item.tipo}:${item.idCadastro}`, nome: item.nome,
      categoria: item.tipo === "COMBO" ? "Combos" : item.composicao?.[0]?.categoria || "Sem categoria",
      quantidade: item.quantidade, centavos };
  });
}

export function construirVendasProdutos(pedidos) {
  const vendas = new Map();
  for (const pedido of pedidos) for (const item of itensVendidos(pedido)) {
    const anterior = vendas.get(item.id) || { ...item, quantidade: 0, centavos: 0n };
    anterior.quantidade += item.quantidade;
    anterior.centavos += item.centavos;
    vendas.set(item.id, anterior);
  }
  return [...vendas.values()].map((item) => ({ ...item, revenue: emReais(item.centavos) }));
}

export function resumirFinanceiro(pedidos) {
  const resumo = { faturamentoCentavos: 0n, recebidoCentavos: 0n, estornadoCentavos: 0n,
    liquidoCentavos: 0n, excedenteCentavos: 0n, saldoCentavos: 0n, descontoCentavos: 0n, legados: 0 };
  for (const pedido of pedidos) {
    if (!pedido.fotografia) { resumo.legados++; continue; }
    for (const campo of ["recebidoCentavos", "estornadoCentavos", "liquidoCentavos", "excedenteCentavos"]) {
      resumo[campo] += BigInt(pedido.financeiro[campo]);
    }
    if (vendaValida(pedido)) {
      resumo.faturamentoCentavos += BigInt(pedido.fotografia.totalCentavos);
      resumo.descontoCentavos += BigInt(pedido.fotografia.descontoCentavos);
      const saldo = BigInt(pedido.fotografia.totalCentavos) - BigInt(pedido.financeiro.liquidoCentavos);
      resumo.saldoCentavos += saldo > 0n ? saldo : 0n;
    }
  }
  return resumo;
}

export function pedidosPorHora(pedidos) {
  const contagens = new Map(Array.from({ length: 14 }, (_, i) => [i + 7, 0]));
  for (const pedido of pedidos) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(pedido.horarioEntrega || "")) continue;
    const hora = Number(pedido.horarioEntrega.slice(0, 2));
    contagens.set(hora, (contagens.get(hora) || 0) + 1);
  }
  return [...contagens].sort(([a], [b]) => a - b).map(([hora, value]) => ({ label: `${String(hora).padStart(2, "0")}:00`, value }));
}
