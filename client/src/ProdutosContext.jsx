import React, { createContext, useContext, useState } from "react";
import { normalizarTexto } from "./formatadores";

/* ---------------------------------------------------------
   Contexto global de produtos.
   Qualquer tela que precisar ler ou alterar produtos usa o
   hook useProdutos() em vez de receber tudo via props.
--------------------------------------------------------- */

const ProdutosContext = createContext(null);

let idCounter = 1;

export function ProdutosProvider({ children }) {
  const [produtos, setProdutos] = useState([]);

  /** Retorna o produto com o mesmo nome (ignorando maiúsculas/espaços), se existir. */
  const buscarProdutoPorNome = (nome, excludeId) => {
    const target = normalizarTexto(nome);
    if (!target) return null;
    return (
      produtos.find(
        (p) => normalizarTexto(p.nome) === target && p.id !== excludeId
      ) || null
    );
  };

  /**
   * Cria um novo produto com status inicial "Ativo".
   * data: { nome, categoria, unidade, preco, descricao }
   *
   * Se já existir um produto com o mesmo nome, não cria um novo —
   * retorna o cadastro existente como proteção extra contra duplicidade.
   */
  const adicionarProduto = (data) => {
    const existing = buscarProdutoPorNome(data.nome);
    if (existing) return existing;

    const novoProduto = {
      id: idCounter++,
      status: "Ativo",
      ...data,
    };
    setProdutos((prev) => [...prev, novoProduto]);
    return novoProduto;
  };

  /**
   * Atualiza campos de um produto existente.
   * Retorna false (e não aplica a alteração) se o novo nome já
   * pertencer a outro produto.
   */
  const atualizarProduto = (id, data) => {
    if (data.nome) {
      const existing = buscarProdutoPorNome(data.nome, id);
      if (existing) return false;
    }
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );
    return true;
  };

  /** Alterna Ativo/Inativo. */
  const alternarStatus = (id) => {
    setProdutos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "Ativo" ? "Inativo" : "Ativo" }
          : p
      )
    );
  };

  const removerProduto = (id) => {
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <ProdutosContext.Provider
      value={{
        produtos,
        adicionarProduto,
        atualizarProduto,
        alternarStatus,
        removerProduto,
        buscarProdutoPorNome,
      }}
    >
      {children}
    </ProdutosContext.Provider>
  );
}

export function useProdutos() {
  const ctx = useContext(ProdutosContext);
  if (!ctx) {
    throw new Error(
      "useProdutos precisa ser usado dentro de <ProdutosProvider>"
    );
  }
  return ctx;
}
