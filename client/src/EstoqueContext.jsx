import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de estoque.
   O estoque é indexado pelo id do produto (vindo do ProdutosContext).
   Cada entrada guarda: { quantidade, limiteCritico }
   - quantidade: quantas unidades existem prontas
   - limiteCritico: a partir de quantas unidades o produto vira "Baixo"
     (definido pelo usuário, produto a produto)
--------------------------------------------------------- */

const EstoqueContext = createContext(null);

const LIMITE_PADRAO = 5;
const ENTRADA_PADRAO = { quantidade: 0, limiteCritico: LIMITE_PADRAO };

export function EstoqueProvider({ children }) {
  const [estoque, setEstoque] = useState({});

  /** Sempre retorna uma entrada válida, mesmo que o produto ainda não tenha estoque registrado. */
  const obterEstoque = (idProduto) => estoque[idProduto] || ENTRADA_PADRAO;

  /** Define a quantidade diretamente (nunca negativa). */
  const definirQuantidade = (idProduto, quantidade) => {
    setEstoque((prev) => ({
      ...prev,
      [idProduto]: {
        ...(prev[idProduto] || ENTRADA_PADRAO),
        quantidade: Math.max(0, quantidade),
      },
    }));
  };

  /** Soma (ou subtrai, com delta negativo) unidades ao estoque.
   *  Por padrão nunca fica negativo. Passe allowNegative=true para permitir
   *  que fique negativo — usado na baixa automática por pedidos, onde o
   *  número negativo sinaliza quanto falta para atender o que já foi vendido. */
  const ajustarQuantidade = (idProduto, delta, allowNegative = false) => {
    setEstoque((prev) => {
      const current = prev[idProduto] || ENTRADA_PADRAO;
      const next = current.quantidade + delta;
      return {
        ...prev,
        [idProduto]: {
          ...current,
          quantidade: allowNegative ? next : Math.max(0, next),
        },
      };
    });
  };

  /** Retira `amount` unidades do estoque — usado quando produtos saem do sistema.
   *  allowNegative=true permite ultrapassar o estoque disponível (ver ajustarQuantidade). */
  const removerQuantidade = (idProduto, amount, allowNegative = false) => {
    if (!amount || amount <= 0) return;
    ajustarQuantidade(idProduto, -Math.abs(amount), allowNegative);
  };

  /** Define o limite a partir do qual o produto entra em alerta de "Baixo". */
  const definirLimiteCritico = (idProduto, threshold) => {
    setEstoque((prev) => {
      const current = prev[idProduto] || ENTRADA_PADRAO;
      return {
        ...prev,
        [idProduto]: {
          ...current,
          limiteCritico: Math.max(0, threshold),
        },
      };
    });
  };

  return (
    <EstoqueContext.Provider
      value={{
        estoque,
        obterEstoque,
        definirQuantidade,
        ajustarQuantidade,
        removerQuantidade,
        definirLimiteCritico,
      }}
    >
      {children}
    </EstoqueContext.Provider>
  );
}

export function useEstoque() {
  const ctx = useContext(EstoqueContext);
  if (!ctx) {
    throw new Error("useEstoque precisa ser usado dentro de <EstoqueProvider>");
  }
  return ctx;
}
