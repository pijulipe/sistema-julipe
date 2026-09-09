import { requisitarApi } from "./apiService.js";
export const consultarPedidos = (token, caminho = "", metodo = "GET", corpo) => requisitarApi(`/api/pedidos${caminho}`, metodo, corpo, token);
export function adaptarPedido(pedido) {
  const foto = pedido.fotografia;
  return { ...pedido, id: pedido.idPedido, status: pedido.status.toLowerCase(),
    cliente: foto ? { ...foto.cliente, id: foto.idCliente } : { nome: "Pedido legado — reconciliação necessária" },
    itens: (foto?.itens || []).map((i) => ({ ...i, id: i.tipo === "COMBO" ? `combo-${i.idCadastro}` : Number(i.idCadastro), preco: Number(i.precoPacoteCentavos) / 100 / i.multiploMinimo, imagemReferencia: i.urlFoto || null })),
    dataEntrega: foto?.dataEntrega || "", horarioEntrega: foto?.horarioEntrega || "", tipoEntrega: foto?.tipoEntrega.toLowerCase() || "retirada",
    endereco: foto ? Object.values(foto.endereco).filter(Boolean).join(", ") : "",
    observacoes: foto?.observacoes || "", subtotal: Number(foto?.subtotalCentavos || 0) / 100, total: Number(foto?.totalCentavos || 0) / 100,
    bairro: foto?.endereco?.bairro || "", valorDesconto: Number(foto?.descontoCentavos || 0) / 100,
    descontoPercentual: Number(foto?.desconto.percentual || 0), statusPagamento: pedido.financeiro?.situacao.toLowerCase() || "pendente",
  };
}
