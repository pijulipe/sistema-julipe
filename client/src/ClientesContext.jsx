import React, { createContext, useContext, useState } from "react";
import { normalizarTelefone } from "./formatadores";

/* ---------------------------------------------------------
   Contexto global de clientes.
   Qualquer tela que precisar ler ou alterar clientes usa o
   hook useClientes() em vez de receber tudo via props.
--------------------------------------------------------- */

const ClientesContext = createContext(null);

let idCounter = 1;

export function ClientesProvider({ children }) {
  const [clientes, setClientes] = useState([]);

  /** Retorna o cliente com o mesmo telefone (ignorando formatação), se existir. */
  const buscarClientePorTelefone = (telefone, excludeId) => {
    const target = normalizarTelefone(telefone);
    if (!target) return null;
    return (
      clientes.find(
        (c) => normalizarTelefone(c.telefone) === target && c.id !== excludeId
      ) || null
    );
  };

  /**
   * Cria um novo cliente.
   * data: { nome, telefone, endereco, number, bairro, reference, observacoes }
   *
   * Se já existir um cliente com o mesmo telefone, não cria um novo —
   * retorna o cadastro existente. A tela que chama isso deve, de
   * preferência, checar buscarClientePorTelefone antes para mostrar um aviso;
   * isso aqui é uma proteção extra contra duplicidade.
   */
  const adicionarCliente = (data) => {
    const existing = buscarClientePorTelefone(data.telefone);
    if (existing) return existing;

    const novoCliente = { id: idCounter++, ...data };
    setClientes((prev) => [...prev, novoCliente]);
    return novoCliente;
  };

  /**
   * Atualiza campos de um cliente existente.
   * Retorna false (e não aplica a alteração) se o novo telefone já
   * pertencer a outro cliente.
   */
  const atualizarCliente = (id, data) => {
    if (data.telefone) {
      const existing = buscarClientePorTelefone(data.telefone, id);
      if (existing) return false;
    }
    setClientes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
    return true;
  };

  const removerCliente = (id) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        adicionarCliente,
        atualizarCliente,
        removerCliente,
        buscarClientePorTelefone,
      }}
    >
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const ctx = useContext(ClientesContext);
  if (!ctx) {
    throw new Error("useClientes precisa ser usado dentro de <ClientesProvider>");
  }
  return ctx;
}
