import { createContext, useContext, useState, useEffect } from "react";
import {
  entrar,
  obterSessao,
  sair,
  acompanharAutenticacao,
} from "./services/autenticacaoService.js";

const AutenticacaoContext = createContext(null);

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregandoAutenticacao, setCarregandoAutenticacao] = useState(true);

  useEffect(() => {
    async function restaurarSessao() {
      try {
        const { sessao, usuario } = await obterSessao();
        setSessao(sessao);
        setUsuario(usuario);
      } catch {
        setSessao(null);
        setUsuario(null);
        console.log("Erro ao restaurar sessão");
      } finally {
        setCarregandoAutenticacao(false);
      }
    }
    restaurarSessao();
    const inscricaoAutenticacao = acompanharAutenticacao((sessaoAtual, usuarioAtual) => {
      setSessao(sessaoAtual);
      setUsuario(usuarioAtual);
      setCarregandoAutenticacao(false);
    });
    return ()=>{
      inscricaoAutenticacao.unsubscribe();
    }
  }, []);

  async function fazerLogin({ email, senha }) {
    const resultado = await entrar({ email, senha });
    setSessao(resultado.sessao);
    setUsuario(resultado.usuario);
    return resultado;
  }

  async function fazerLogout() {
    await sair();

    setSessao(null);
    setUsuario(null);
  }

  return (
    <AutenticacaoContext.Provider
      value={{ sessao, usuario, autenticado: Boolean(sessao), fazerLogin, carregandoAutenticacao, fazerLogout }}
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
