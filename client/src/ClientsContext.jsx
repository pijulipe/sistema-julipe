import React, { createContext, useContext, useState } from "react";
import { normalizePhone } from "./formatters";

/* ---------------------------------------------------------
   Contexto global de clientes.
   Qualquer tela que precisar ler ou alterar clientes usa o
   hook useClients() em vez de receber tudo via props.
--------------------------------------------------------- */

const ClientsContext = createContext(null);

let idCounter = 1;

export function ClientsProvider({ children }) {
  const [clients, setClients] = useState([]);

  /** Retorna o cliente com o mesmo telefone (ignorando formatação), se existir. */
  const findClientByPhone = (phone, excludeId) => {
    const target = normalizePhone(phone);
    if (!target) return null;
    return (
      clients.find(
        (c) => normalizePhone(c.phone) === target && c.id !== excludeId
      ) || null
    );
  };

  /**
   * Cria um novo cliente.
   * data: { name, phone, address, number, neighborhood, reference, notes }
   *
   * Se já existir um cliente com o mesmo telefone, não cria um novo —
   * retorna o cadastro existente. A tela que chama isso deve, de
   * preferência, checar findClientByPhone antes para mostrar um aviso;
   * isso aqui é uma proteção extra contra duplicidade.
   */
  const addClient = (data) => {
    const existing = findClientByPhone(data.phone);
    if (existing) return existing;

    const newClient = { id: idCounter++, ...data };
    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  /**
   * Atualiza campos de um cliente existente.
   * Retorna false (e não aplica a alteração) se o novo telefone já
   * pertencer a outro cliente.
   */
  const updateClient = (id, data) => {
    if (data.phone) {
      const existing = findClientByPhone(data.phone, id);
      if (existing) return false;
    }
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
    return true;
  };

  const removeClient = (id) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <ClientsContext.Provider
      value={{
        clients,
        addClient,
        updateClient,
        removeClient,
        findClientByPhone,
      }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) {
    throw new Error("useClients precisa ser usado dentro de <ClientsProvider>");
  }
  return ctx;
}
