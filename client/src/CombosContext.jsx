import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { atualizarCombo as atualizarComboApi, criarCombo, excluirCombo, listarCombos } from "./services/comboService.js";

const CombosContext = createContext(null);

function adaptarCombo(combo) {
  return {
    ...combo,
    id: Number(combo.idCombo),
    status: combo.ativo ? "Ativo" : "Inativo",
    itens: combo.itens.map((item) => ({ ...item, idProduto: Number(item.idProduto) })),
  };
}

export function CombosProvider({ children }) {
  const [combos, setCombos] = useState([]);
  const [carregandoCombos, setCarregandoCombos] = useState(true);
  const [erroCombos, setErroCombos] = useState("");
  const [paginacao, setPaginacao] = useState({ pagina: 1, limite: 20, total: 0, totalPaginas: 0 });
  const { tokenInterno, fazerLogout } = useAutenticacao();

  async function tratarErro(erro) {
    setErroCombos(erro?.message || "Não foi possível concluir a operação.");
    if (erro?.status === 401) await fazerLogout();
    throw erro;
  }
  const tratarErroRef = useRef(tratarErro);
  useEffect(() => { tratarErroRef.current = tratarErro; });

  async function carregarCombos(filtros = {}) {
    if (!tokenInterno) return;
    setCarregandoCombos(true);
    setErroCombos("");
    try {
      const resultado = await listarCombos(tokenInterno, { pagina: 1, limite: paginacao.limite, ...filtros });
      setCombos(resultado.dados.map(adaptarCombo));
      setPaginacao(resultado.paginacao);
    } catch (erro) {
      await tratarErro(erro).catch(() => {});
    } finally {
      setCarregandoCombos(false);
    }
  }

  const carregarRef = useRef(carregarCombos);
  useEffect(() => { carregarRef.current = carregarCombos; });
  useEffect(() => {
    if (!tokenInterno) {
      setCombos([]);
      setCarregandoCombos(false);
      return;
    }
    carregarRef.current();
  }, [tokenInterno]);

  async function salvarCombo(dados, idCombo) {
    setErroCombos("");
    try {
      const salvo = idCombo
        ? await atualizarComboApi(idCombo, dados, tokenInterno)
        : await criarCombo(dados, tokenInterno);
      return adaptarCombo(salvo);
    } catch (erro) {
      return tratarErro(erro);
    }
  }

  async function removerCombo(idCombo) {
    setErroCombos("");
    try { await excluirCombo(idCombo, tokenInterno); }
    catch (erro) { return tratarErro(erro); }
  }

  return <CombosContext.Provider value={{
    combos, carregandoCombos, erroCombos, paginacao,
    carregarCombos, salvarCombo, removerCombo,
  }}>{children}</CombosContext.Provider>;
}

export function useCombos() {
  const contexto = useContext(CombosContext);
  if (!contexto) throw new Error("useCombos precisa ser usado dentro de CombosProvider.");
  return contexto;
}
