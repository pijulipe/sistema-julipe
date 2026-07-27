import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de estoque.
   O estoque é indexado pelo id do produto (vindo do ProductsContext).
   Cada entrada guarda: { quantity, criticalThreshold }
   - quantity: quantas unidades existem prontas
   - criticalThreshold: a partir de quantas unidades o produto vira "Baixo"
     (definido pelo usuário, produto a produto)
--------------------------------------------------------- */

const StockContext = createContext(null);

const DEFAULT_THRESHOLD = 5;
const DEFAULT_ENTRY = { quantity: 0, criticalThreshold: DEFAULT_THRESHOLD };

export function StockProvider({ children }) {
  const [stock, setStock] = useState({});

  /** Sempre retorna uma entrada válida, mesmo que o produto ainda não tenha estoque registrado. */
  const getStock = (productId) => stock[productId] || DEFAULT_ENTRY;

  /** Define a quantidade diretamente (nunca negativa). */
  const setQuantity = (productId, quantity) => {
    setStock((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || DEFAULT_ENTRY),
        quantity: Math.max(0, quantity),
      },
    }));
  };

  /** Soma (ou subtrai, com delta negativo) unidades ao estoque.
   *  Por padrão nunca fica negativo. Passe allowNegative=true para permitir
   *  que fique negativo — usado na baixa automática por pedidos, onde o
   *  número negativo sinaliza quanto falta para atender o que já foi vendido. */
  const adjustQuantity = (productId, delta, allowNegative = false) => {
    setStock((prev) => {
      const current = prev[productId] || DEFAULT_ENTRY;
      const next = current.quantity + delta;
      return {
        ...prev,
        [productId]: {
          ...current,
          quantity: allowNegative ? next : Math.max(0, next),
        },
      };
    });
  };

  /** Retira `amount` unidades do estoque — usado quando produtos saem do sistema.
   *  allowNegative=true permite ultrapassar o estoque disponível (ver adjustQuantity). */
  const removeQuantity = (productId, amount, allowNegative = false) => {
    if (!amount || amount <= 0) return;
    adjustQuantity(productId, -Math.abs(amount), allowNegative);
  };

  /** Define o limite a partir do qual o produto entra em alerta de "Baixo". */
  const setCriticalThreshold = (productId, threshold) => {
    setStock((prev) => {
      const current = prev[productId] || DEFAULT_ENTRY;
      return {
        ...prev,
        [productId]: {
          ...current,
          criticalThreshold: Math.max(0, threshold),
        },
      };
    });
  };

  return (
    <StockContext.Provider
      value={{
        stock,
        getStock,
        setQuantity,
        adjustQuantity,
        removeQuantity,
        setCriticalThreshold,
      }}
    >
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) {
    throw new Error("useStock precisa ser usado dentro de <StockProvider>");
  }
  return ctx;
}
