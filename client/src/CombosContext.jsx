import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de combos.
   Um combo agrupa 1+ produtos com um preço próprio.
   itens: [{ idProduto, quantidade }]
--------------------------------------------------------- */

const CombosContext = createContext(null);

let idCounter = 1;

export function CombosProvider({ children }) {
  const [combos, setCombos] = useState([]);

  /**
   * Cria um novo combo com status inicial "Ativo".
   * data: { nome, descricao, preco, itens, status }
   */
  const adicionarCombo = (data) => {
    const novoCombo = {
      id: idCounter++,
      status: "Ativo",
      ...data,
    };
    setCombos((prev) => [...prev, novoCombo]);
    return novoCombo;
  };

  /** Atualiza campos de um combo existente. */
  const atualizarCombo = (id, data) => {
    setCombos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  };

  const removerCombo = (id) => {
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CombosContext.Provider
      value={{ combos, adicionarCombo, atualizarCombo, removerCombo }}
    >
      {children}
    </CombosContext.Provider>
  );
}

export function useCombos() {
  const ctx = useContext(CombosContext);
  if (!ctx) {
    throw new Error("useCombos precisa ser usado dentro de <CombosProvider>");
  }
  return ctx;
}
