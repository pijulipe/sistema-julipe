import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de pedidos.
   Qualquer tela que precisar ler ou alterar pedidos usa o
   hook useOrders() em vez de receber tudo via props.
--------------------------------------------------------- */

const OrdersContext = createContext(null);

let idCounter = 1;

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);

  /**
   * Cria um novo pedido com status inicial "recebido".
   * orderData: { client, items, deliveryDate, deliveryTime, deliveryType,
   *              notes, paymentMethod, paymentStatus, discountPercent,
   *              discountValue, subtotal, total, address, stockDeducted }
   *
   * stockDeducted: true se o estoque já foi fisicamente descontado (via
   * StockContext) no momento da criação deste pedido — gravado uma única
   * vez e nunca recalculado depois, mesmo que o interruptor global de
   * baixa automática mude. É o que permite ao NovoPedidoModal saber quais
   * pedidos ainda "pesam" sobre o estoque disponível e quais já foram
   * contabilizados fisicamente.
   */
  const addOrder = (orderData) => {
    const newOrder = {
      id: idCounter++,
      status: "recebido", // recebido | em_producao | pronto
      createdAt: new Date().toISOString(),
      ...orderData,
    };
    setOrders((prev) => [...prev, newOrder]);
    return newOrder;
  };

  /** Avança: recebido -> em_producao -> pronto */
  const advanceStatus = (id) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (o.status === "recebido") return { ...o, status: "em_producao" };
        if (o.status === "em_producao") return { ...o, status: "pronto" };
        return o;
      })
    );
  };

  /** Atualiza campos de um pedido existente (itens, endereço, pagamento etc). */
  const updateOrder = (id, data) => {
    setOrders((prev) =>
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
  const completeOrder = (id) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const nextStatus = o.deliveryType === "retirada" ? "entregue" : "em_rota";
        return { ...o, status: nextStatus };
      })
    );
  };

  /** Confirma a entrega de um pedido que estava "em_rota". */
  const markDelivered = (id) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id && o.status === "em_rota" ? { ...o, status: "entregue" } : o
      )
    );
  };

  /** Volta um passo: pronto -> em_producao -> recebido */
  const revertStatus = (id) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (o.status === "pronto") return { ...o, status: "em_producao" };
        if (o.status === "em_producao") return { ...o, status: "recebido" };
        return o;
      })
    );
  };

  const removeOrder = (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  /**
   * Cancela um pedido. Diferente de removeOrder, o pedido não é apagado —
   * ele passa a ter status "cancelado" e continua existindo no histórico
   * (ex: para aparecer em relatórios), mas some das telas operacionais
   * (Produção, Expedição) pois nenhuma delas reconhece esse status.
   * reason: motivo opcional informado por quem cancelou.
   */
  const cancelOrder = (id, reason) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status: "cancelado",
              cancelReason: reason || "",
              cancelledAt: new Date().toISOString(),
            }
          : o
      )
    );
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        addOrder,
        updateOrder,
        advanceStatus,
        revertStatus,
        completeOrder,
        markDelivered,
        cancelOrder,
        removeOrder,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) {
    throw new Error("useOrders precisa ser usado dentro de <OrdersProvider>");
  }
  return ctx;
}
