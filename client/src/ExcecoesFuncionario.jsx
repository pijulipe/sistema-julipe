import React, { useState } from "react";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { requisitarApi } from "./services/apiService.js";
const modulos = ["PEDIDOS", "PRODUCAO", "PRODUTO", "COMBOS", "RELATORIO", "CLIENTES", "ESTOQUE", "EXPEDICAO", "FUNCIONARIOS"];
export default function ExcecoesFuncionario({ funcionario }) {
  const { tokenInterno, fazerLogout } = useAutenticacao();
  const [excecoes, setExcecoes] = useState(funcionario.excecoesModulos || {});
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  async function salvar() {
    setOcupado(true); setMensagem("");
    try { await requisitarApi(`/api/funcionarios/${funcionario.idUsuario}/excecoes`, "PUT", { excecoesModulos: excecoes }, tokenInterno); setMensagem("Exceções salvas."); }
    catch (erro) { setMensagem(erro.message); if (erro.status === 401) await fazerLogout(); }
    finally { setOcupado(false); }
  }
  return <details><summary>Cargo e exceções individuais</summary><p className="my-2 text-sm">Cargo: {funcionario.cargo?.nome || "Sem cargo"}. Exceções prevalecem sobre o cargo e as concessões básicas.</p><fieldset disabled={ocupado || !funcionario.acoesPermitidas?.editarPermissoes} className="space-y-2">{modulos.map((modulo) => <label key={modulo} className="flex justify-between">{modulo}<select className="rounded-lg border p-1" value={String(excecoes[modulo] ?? "herdar")} onChange={(e) => { const novas = { ...excecoes }; if (e.target.value === "herdar") delete novas[modulo]; else novas[modulo] = e.target.value === "true"; setExcecoes(novas); }}><option value="herdar">Herdar</option><option value="true">Conceder</option><option value="false">Negar</option></select></label>)}<button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2 text-sm border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800" onClick={salvar}>Salvar exceções</button></fieldset>{mensagem && <p role="status">{mensagem}</p>}</details>;
}
