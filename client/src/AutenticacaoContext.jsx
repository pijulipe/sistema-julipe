import { createContext, useContext, useState } from "react";
import { entrar } from "./services/autenticacaoService.js";

const AutenticacaoContext = createContext(null);

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [usuario, setUsuario] = useState(null);

  async function fazerLogin({ email, senha }) {
    const resultado = await entrar({ email, senha });
    setSessao(resultado.sessao);
    setUsuario(resultado.usuario);
    return resultado;
  }

  return (
    <AutenticacaoContext.Provider
      value={{ sessao, usuario, autenticado: Boolean(sessao), fazerLogin }}
    >
      {children}
    </AutenticacaoContext.Provider>
  );
}

export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContext);

  if (!contexto) {
    throw new Error("useAutenticacao deve ser usado dentro de AutenticacaoProvider.");
  }

  return contexto;
}
