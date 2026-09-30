import { dataOperacao } from "./producao.js";

export function resumirExpedicao(pedidos, hoje = dataOperacao()) {
  const doDia = pedidos.filter((pedido) => pedido.dataEntrega === hoje && ["pronto", "em_rota", "entregue"].includes(pedido.status));
  const ativos = doDia.filter((pedido) => pedido.status !== "entregue");
  const concluidos = doDia.filter((pedido) => pedido.status === "entregue");
  return {
    ativos, concluidos,
    contadores: {
      prontos: ativos.filter((pedido) => pedido.status === "pronto").length,
      emRota: ativos.filter((pedido) => pedido.status === "em_rota").length,
      entregues: concluidos.filter((pedido) => pedido.tipoEntrega === "entrega").length,
      retirados: concluidos.filter((pedido) => pedido.tipoEntrega === "retirada").length,
    },
  };
}

export function filtrarExpedicao(pedidos, busca) {
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return pedidos.filter((pedido) => !termo || [pedido.cliente?.nome, pedido.cliente?.telefone, pedido.bairro || pedido.cliente?.bairro]
    .some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo)))
    .sort((a, b) => (a.horarioEntrega || "").localeCompare(b.horarioEntrega || ""));
}
