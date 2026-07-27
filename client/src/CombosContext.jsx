import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de combos.
   Um combo agrupa 1+ produtos com um preço próprio.
   items: [{ productId, qty }]
--------------------------------------------------------- */

const CombosContext = createContext(null);

let idCounter = 1;

export function CombosProvider({ children }) {
  const [combos, setCombos] = useState([]);

  /**
   * Cria um novo combo com status inicial "Ativo".
   * data: { name, description, price, items, status }
   */
  const addCombo = (data) => {
    const newCombo = {
      id: idCounter++,
      status: "Ativo",
      ...data,
    };
    setCombos((prev) => [...prev, newCombo]);
    return newCombo;
  };

  /** Atualiza campos de um combo existente. */
  const updateCombo = (id, data) => {
    setCombos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  };

  const removeCombo = (id) => {
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CombosContext.Provider
      value={{ combos, addCombo, updateCombo, removeCombo }}
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
