export const etapasProducao = ["recebido", "em_producao", "pronto"];

export function dataOperacao(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function filtrarProducao(pedidos, { periodo = "hoje", data = "", busca = "", pagamento = "todos", hoje = dataOperacao() } = {}) {
  const referencia = new Date(`${hoje}T12:00:00Z`);
  const segunda = new Date(referencia);
  segunda.setUTCDate(referencia.getUTCDate() - (referencia.getUTCDay() + 6) % 7);
  const domingo = new Date(segunda);
  domingo.setUTCDate(segunda.getUTCDate() + 6);
  const inicio = segunda.toISOString().slice(0, 10);
  const fim = domingo.toISOString().slice(0, 10);
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return pedidos.filter((pedido) => {
    if (!etapasProducao.includes(pedido.status)) return false;
    const dia = pedido.dataEntrega;
    if (periodo === "hoje" && (!dia || dia > hoje)) return false;
    if (periodo === "data" && (!data || dia !== data)) return false;
    if (periodo === "semana" && (!dia || dia < inicio || dia > fim)) return false;
    if (periodo === "mes" && dia?.slice(0, 7) !== hoje.slice(0, 7)) return false;
    if (pagamento !== "todos" && pedido.statusPagamento !== pagamento) return false;
    return !termo || [String(pedido.id), `#${pedido.id}`, pedido.cliente?.nome, ...(pedido.itens || []).map((item) => item.nome)].some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo));
  }).sort((a, b) => `${a.dataEntrega}|${a.horarioEntrega}`.localeCompare(`${b.dataEntrega}|${b.horarioEntrega}`) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

export function produtosParaPreparo(item) {
  if (item.tipo !== "COMBO") return [{ nome: item.nome, quantidade: item.quantidade }];
  return (item.composicao || []).map((componente) => ({ nome: componente.nome, quantidade: componente.quantidade * item.quantidade }));
}

// Seleciona apenas informações de preparo; preços, URLs temporárias e revisão isolada não geram aviso.
export function fotografiaPreparo(fotografia) {
  if (!fotografia) return null;
  return {
    dataEntrega: fotografia.dataEntrega, horarioEntrega: fotografia.horarioEntrega,
    observacoes: fotografia.observacoes || "", detalhesPersonalizacao: fotografia.detalhesPersonalizacao || "",
    itens: (fotografia.itens || []).map((item) => ({
      chaveItem: item.chaveItem, tipo: item.tipo, idCadastro: item.idCadastro, nome: item.nome,
      quantidade: item.quantidade, observacoes: item.observacoes || "", foto: item.foto || null,
      composicao: (item.composicao || []).map((componente) => ({ idProduto: componente.idProduto, nome: componente.nome, quantidade: componente.quantidade })).sort((a, b) => String(a.idProduto).localeCompare(String(b.idProduto)) || a.nome.localeCompare(b.nome) || a.quantidade - b.quantidade),
    })).sort((a, b) => a.chaveItem.localeCompare(b.chaveItem)),
  };
}

export function alterouPreparo(anterior, novo) {
  return Boolean(anterior && novo && JSON.stringify(fotografiaPreparo(anterior)) !== JSON.stringify(fotografiaPreparo(novo)));
}

export function alteracaoPreparoAuditada(evento) {
  const { anterior, novo } = evento.dados || {};
  return Boolean(anterior?.itens && novo?.itens && alterouPreparo(anterior, novo));
}

export function permissoesProducao(acesso) {
  const gerente = acesso?.perfilAcesso === "GERENTE";
  const editar = gerente || Boolean(acesso?.permissoes?.includes("PEDIDOS"));
  return { editar, cancelar: editar && (gerente || Boolean(acesso?.podeCancelarPedido)), operar: editar || Boolean(acesso?.permissoes?.some((modulo) => ["PRODUCAO", "EXPEDICAO"].includes(modulo))) };
}
