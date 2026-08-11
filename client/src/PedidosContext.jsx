import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de pedidos.
   Qualquer tela que precisar ler ou alterar pedidos usa o
   hook usePedidos() em vez de receber tudo via props.
--------------------------------------------------------- */

const PedidosContext = createContext(null);

let idCounter = 1;

export function PedidosProvider({ children }) {
  const [pedidos, setPedidos] = useState([]);

  /**
   * Cria um novo pedido com status inicial "recebido".
   * dadosPedido: { cliente, itens, dataEntrega, horarioEntrega, tipoEntrega,
   *              observacoes, formaPagamento, statusPagamento, descontoPercentual,
   *              valorDesconto, subtotal, total, endereco, estoqueBaixado }
   *
   * estoqueBaixado: true se o estoque já foi fisicamente descontado (via
   * EstoqueContext) no momento da criação deste pedido — gravado uma única
   * vez e nunca recalculado depois, mesmo que o interruptor global de
   * baixa automática mude. É o que permite ao NovoPedidoModal saber quais
   * pedidos ainda "pesam" sobre o estoque disponível e quais já foram
   * contabilizados fisicamente.
   */
  const adicionarPedido = (dadosPedido) => {
    const novoPedido = {
      id: idCounter++,
      status: "recebido", // recebido | em_producao | pronto
      criadoEm: new Date().toISOString(),
      ...dadosPedido,
    };
    setPedidos((prev) => [...prev, novoPedido]);
    return novoPedido;
  };

  /** Avança: recebido -> em_producao -> pronto */
  const avancarStatus = (id) => {
    setPedidos((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (o.status === "recebido") return { ...o, status: "em_producao" };
        if (o.status === "em_producao") return { ...o, status: "pronto" };
        return o;
      })
    );
  };

  /** Atualiza campos de um pedido existente (itens, endereço, pagamento etc). */
  const atualizarPedido = (id, data) => {
    setPedidos((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...data } : o))
    );
  };

  /**
   * Conclui a produção de um pedido. Em vez de remover o pedido, ele passa
   * a ter um status pós-produção:
   *  - "retirada" -> vai direto para "entregue"
   *  - "entrega"  -> vai para "em_rota" (aguardando confirmação de entrega)
   * O pedido continua aparecendo no início e seu faturamento é mantido.
   */
  const concluirPedido = (id) => {
    setPedidos((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const nextStatus = o.tipoEntrega === "retirada" ? "entregue" : "em_rota";
        return { ...o, status: nextStatus };
      })
    );
  };

  /** Confirma a entrega de um pedido que estava "em_rota". */
  const marcarEntregue = (id) => {
    setPedidos((prev) =>
      prev.map((o) =>
        o.id === id && o.status === "em_rota" ? { ...o, status: "entregue" } : o
      )
    );
  };

  /** Volta um passo: pronto -> em_producao -> recebido */
  const reverterStatus = (id) => {
    setPedidos((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (o.status === "pronto") return { ...o, status: "em_producao" };
        if (o.status === "em_producao") return { ...o, status: "recebido" };
        return o;
      })
    );
  };

  const removerPedido = (id) => {
    setPedidos((prev) => prev.filter((o) => o.id !== id));
  };

  /**
   * Cancela um pedido. Diferente de removerPedido, o pedido não é apagado —
   * ele passa a ter status "cancelado" e continua existindo no histórico
   * (ex: para aparecer em relatórios), mas some das telas operacionais
   * (Produção, Expedição) pois nenhuma delas reconhece esse status.
   * motivo: motivo opcional informado por quem cancelou.
   */
  const cancelarPedido = (id, motivo) => {
    setPedidos((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status: "cancelado",
              motivoCancelamento: motivo || "",
              canceladoEm: new Date().toISOString(),
            }
          : o
      )
    );
  };

  return (
    <PedidosContext.Provider
      value={{
        pedidos,
        adicionarPedido,
        atualizarPedido,
        avancarStatus,
        reverterStatus,
        concluirPedido,
        marcarEntregue,
        cancelarPedido,
        removerPedido,
      }}
    >
      {children}
    </PedidosContext.Provider>
  );
}

export function usePedidos() {
  const ctx = useContext(PedidosContext);
  if (!ctx) {
    throw new Error("usePedidos precisa ser usado dentro de <PedidosProvider>");
  }
  return ctx;
}
