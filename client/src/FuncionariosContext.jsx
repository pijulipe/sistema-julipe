import React, { createContext, useContext, useState } from "react";
import { normalizarTexto } from "./formatadores";

/* ---------------------------------------------------------
   Contexto global de funcionários (usuários do sistema).
   Qualquer tela que precisar ler ou alterar funcionários usa o
   hook useFuncionarios() em vez de receber tudo via props.

   Cada funcionário: { id, nome, email, senha, perfil, telasComAcesso, ativo }
   - perfil: "administrador" | "gerente" | "atendente"
   - telasComAcesso: [chaveTela, ...] — só é relevante (e editável) para
     perfis com acesso granular (ver perfilTemAcessoGranular). Para os
     demais perfis, o funcionário tem acesso a todas as telas.
--------------------------------------------------------- */

const FuncionariosContext = createContext(null);

let idCounter = 1;

// Chaves alinhadas com o `view` de App.jsx, para que a lista de telas
// aqui corresponda exatamente às telas navegáveis do sistema.
export const TELAS_ACESSO = [
  { key: "home", label: "Início" },
  { key: "novoPedido", label: "Novo Pedido" },
  { key: "producao", label: "Produção" },
  { key: "produto", label: "Produto" },
  { key: "combos", label: "Combos" },
  { key: "relatorio", label: "Relatório" },
  { key: "clientes", label: "Clientes" },
  { key: "estoque", label: "Estoque" },
  { key: "expedicao", label: "Expedição" },
  { key: "funcionarios", label: "Funcionários" },
];

export const PERFIS_ACESSO = [
  { key: "administrador", label: "Administrador" },
  { key: "gerente", label: "Gerente" },
  { key: "atendente", label: "Atendente" },
];

/** Perfis com acesso total ao sistema por padrão — não usam a lista granular de telas. */
const PERFIS_ACESSO_TOTAL = ["administrador"];

/** Se true, este perfil pode ter telas individuais liberadas/bloqueadas. */
export function perfilTemAcessoGranular(perfil) {
  return !PERFIS_ACESSO_TOTAL.includes(perfil);
}

export function FuncionariosProvider({ children }) {
  const [funcionarios, setFuncionarios] = useState([]);

  /** Retorna o funcionário com o mesmo email (ignorando maiúsculas/espaços), se existir. */
  const buscarFuncionarioPorEmail = (email, excludeId) => {
    const target = normalizarTexto(email);
    if (!target) return null;
    return (
      funcionarios.find(
        (f) => normalizarTexto(f.email) === target && f.id !== excludeId
      ) || null
    );
  };

  /**
   * Cria um novo funcionário.
   * data: { nome, email, senha, perfil, telasComAcesso, ativo }
   */
  const adicionarFuncionario = (data) => {
    const novoFuncionario = { id: idCounter++, ...data };
    setFuncionarios((prev) => [...prev, novoFuncionario]);
    return novoFuncionario;
  };

  /**
   * Atualiza campos de um funcionário existente.
   * Se `data.senha` não vier (ou vier vazio), a senha atual é mantida —
   * quem chama (FuncionarioModal) já cuida de omitir o campo nesse caso.
   */
  const atualizarFuncionario = (id, data) => {
    setFuncionarios((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...data } : f))
    );
  };

  const removerFuncionario = (id) => {
    setFuncionarios((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <FuncionariosContext.Provider
      value={{
        funcionarios,
        adicionarFuncionario,
        atualizarFuncionario,
        removerFuncionario,
        buscarFuncionarioPorEmail,
      }}
    >
      {children}
    </FuncionariosContext.Provider>
  );
}

export function useFuncionarios() {
  const ctx = useContext(FuncionariosContext);
  if (!ctx) {
    throw new Error(
      "useFuncionarios precisa ser usado dentro de <FuncionariosProvider>"
    );
  }
  return ctx;
}
