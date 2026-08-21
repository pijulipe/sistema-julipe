import { createContext, useContext, useState, useEffect } from "react";
import {
  entrar,
  obterSessao,
  sair,
  acompanharAutenticacao,
  trocarTokenSupabase,
} from "./services/autenticacaoService.js";

const AutenticacaoContext = createContext(null);

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [tokenInterno, setTokenInterno] = useState(null);
  const [carregandoAutenticacao, setCarregandoAutenticacao] = useState(true);

  useEffect(() => {
    async function restaurarSessao() {
      try {
        const { sessao, usuario, tokenInterno } = await obterSessao();
        setSessao(sessao);
        setUsuario(usuario);
        setTokenInterno(tokenInterno);
      } catch {
        setSessao(null);
        setUsuario(null);
        setTokenInterno(null);
        console.log("Erro ao restaurar sessão");
      } finally {
        setCarregandoAutenticacao(false);
      }
    }
    restaurarSessao();

    async function renovarToken(sessaoAtual) {
      let jwtRetornado;
      try {
        jwtRetornado = await trocarTokenSupabase(sessaoAtual.access_token);
        setTokenInterno(jwtRetornado);
      } catch {
        try {
          await sair();
        } finally {
          setSessao(null);
          setUsuario(null);
          setTokenInterno(null);
        }
        return;
      }
    }

    const inscricaoAutenticacao = acompanharAutenticacao(
      (evento, sessaoAtual, usuarioAtual) => {
        if (sessaoAtual === null) {
          setSessao(null);
          setUsuario(null);
          setTokenInterno(null);
          setCarregandoAutenticacao(false);
          return;
        }
        setSessao(sessaoAtual);
        setUsuario(usuarioAtual);

        if (evento === "TOKEN_REFRESHED") {
          renovarToken(sessaoAtual);
        }
      },
    );
    return () => {
      inscricaoAutenticacao.unsubscribe();
    };
  }, []);

  async function fazerLogin({ email, senha }) {
    const resultado = await entrar({ email, senha });
    setSessao(resultado.sessao);
    setUsuario(resultado.usuario);
    setTokenInterno(resultado.tokenInterno);
    return resultado;
  }

  async function fazerLogout() {
    await sair();

    setSessao(null);
    setUsuario(null);
    setTokenInterno(null);
  }

  return (
    <AutenticacaoContext.Provider
      value={{
        sessao,
        usuario,
        autenticado: Boolean(sessao && tokenInterno),
        fazerLogin,
        carregandoAutenticacao,
        fazerLogout,
        tokenInterno,
      }}
    >
      {children}
    </AutenticacaoContext.Provider>
  );
}

export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContext);

  if (!contexto) {
    throw new Error(
      "useAutenticacao deve ser usado dentro de AutenticacaoProvider.",
    );
  }

  return contexto;
}
