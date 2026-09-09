import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { consultarPedidos, adaptarPedido } from "./services/pedidoService.js";
const PedidosContext = createContext(null);
export function PedidosProvider({ children }) {
  const { tokenInterno, fazerLogout } = useAutenticacao();
  const [pedidos, setPedidos] = useState([]);
  const [acesso, setAcesso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const operacoes = useRef(new Map());
  const requisitar = useCallback(async (caminho, metodo = "GET", corpo, token = tokenInterno) => {
    try { return await consultarPedidos(token, caminho, metodo, corpo); }
    catch (falha) { if (falha.status === 401 && token === tokenInterno) await fazerLogout(); throw falha; }
  }, [tokenInterno, fazerLogout]);
  const requisitarRef = useRef(requisitar);
  requisitarRef.current = requisitar;
  const recarregar = useCallback(async () => {
    try {
      const { dados: acessoAtual } = await requisitarRef.current("/acesso");
      setAcesso(acessoAtual);
      if (acessoAtual.perfilAcesso === "GERENTE" || acessoAtual.permissoes.some((m) => ["PEDIDOS", "PRODUCAO", "EXPEDICAO", "RELATORIO"].includes(m))) {
        const { dados } = await requisitarRef.current("/painel");
        setPedidos(dados.map(adaptarPedido));
      } else setPedidos([]);
      setErro("");
    } catch (falha) { setErro(falha.message); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => {
    if (tokenInterno) recarregar();
    const temporizador = setInterval(recarregar, 15000);
    return () => clearInterval(temporizador);
  }, [tokenInterno, recarregar]);
  async function executar(id, acao, campos = {}, token) {
    const atual = pedidos.find((p) => p.id === id);
    const caminho = id ? `/${id}${acao ? `/${acao}` : ""}` : "";
    const corpo = { ...(id && { revisao: atual?.revisao }), ...campos };
    const assinatura = JSON.stringify({ caminho, corpo });
    let operacao = operacoes.current.get(assinatura);
    if (operacao?.promessa) return operacao.promessa;
    if (!operacao) { operacao = { chave: campos.chaveOperacao || crypto.randomUUID() }; operacoes.current.set(assinatura, operacao); }
    setOcupado(true);
    operacao.promessa = (async () => {
      try {
        const resultado = await requisitar(caminho, id && !acao ? "PUT" : "POST", { ...corpo, chaveOperacao: operacao.chave }, token);
        operacoes.current.delete(assinatura);
        await recarregar();
        return resultado.dados;
      } catch (falha) { setErro(falha.message); if (falha.status === 409) await recarregar(); throw falha; }
      finally { operacao.promessa = null; setOcupado(false); }
    })();
    return operacao.promessa;
  }
  const mudarStatus = (id, status) => executar(id, "status", { status }).catch(() => null);
  const statusAtual = (id) => pedidos.find((p) => p.id === id);
  return <PedidosContext.Provider value={{ pedidos, acesso, carregando, erro, ocupado, requisitar, recarregar, executar,
    adicionarPedido: (dados) => executar(null, "", { dados }), atualizarPedido: (id, dados) => executar(id, "", { dados }),
    avancarStatus: (id) => mudarStatus(id, statusAtual(id)?.status === "recebido" ? "EM_PRODUCAO" : "PRONTO"),
    reverterStatus: (id) => mudarStatus(id, statusAtual(id)?.status === "pronto" ? "EM_PRODUCAO" : "RECEBIDO"),
    concluirPedido: (id) => mudarStatus(id, statusAtual(id)?.tipoEntrega === "retirada" ? "ENTREGUE" : "EM_ROTA"),
    marcarEntregue: (id) => mudarStatus(id, "ENTREGUE"), cancelarPedido: (id, motivo) => executar(id, "cancelamento", { motivo }).catch(() => null),
  }}>{children}</PedidosContext.Provider>;
}
export function usePedidos() { const contexto = useContext(PedidosContext); if (!contexto) throw new Error("usePedidos exige PedidosProvider."); return contexto; }
