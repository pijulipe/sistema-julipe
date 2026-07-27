import React, { createContext, useContext, useState } from "react";
import { normalizeText } from "./formatters";

/* ---------------------------------------------------------
   Contexto global de produtos.
   Qualquer tela que precisar ler ou alterar produtos usa o
   hook useProducts() em vez de receber tudo via props.
--------------------------------------------------------- */

const ProductsContext = createContext(null);

let idCounter = 1;

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);

  /** Retorna o produto com o mesmo nome (ignorando maiúsculas/espaços), se existir. */
  const findProductByName = (name, excludeId) => {
    const target = normalizeText(name);
    if (!target) return null;
    return (
      products.find(
        (p) => normalizeText(p.name) === target && p.id !== excludeId
      ) || null
    );
  };

  /**
   * Cria um novo produto com status inicial "Ativo".
   * data: { name, category, unit, price, description }
   *
   * Se já existir um produto com o mesmo nome, não cria um novo —
   * retorna o cadastro existente como proteção extra contra duplicidade.
   */
  const addProduct = (data) => {
    const existing = findProductByName(data.name);
    if (existing) return existing;

    const newProduct = {
      id: idCounter++,
      status: "Ativo",
      ...data,
    };
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  /**
   * Atualiza campos de um produto existente.
   * Retorna false (e não aplica a alteração) se o novo nome já
   * pertencer a outro produto.
   */
  const updateProduct = (id, data) => {
    if (data.name) {
      const existing = findProductByName(data.name, id);
      if (existing) return false;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );
    return true;
  };

  /** Alterna Ativo/Inativo. */
  const toggleStatus = (id) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "Ativo" ? "Inativo" : "Ativo" }
          : p
      )
    );
  };

  const removeProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        toggleStatus,
        removeProduct,
        findProductByName,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error(
      "useProducts precisa ser usado dentro de <ProductsProvider>"
    );
  }
  return ctx;
}
