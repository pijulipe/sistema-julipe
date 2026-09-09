import React, { useEffect, useRef, useState } from "react";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { requisitarApi } from "./services/apiService.js";
const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const modulos = ["PEDIDOS", "PRODUCAO", "PRODUTO", "COMBOS", "RELATORIO", "CLIENTES", "ESTOQUE", "EXPEDICAO", "FUNCIONARIOS"];
const campo = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const novoCargo = () => ({ nome: "", modulos: [], podeCancelarPedido: null, limiteDesconto: "0", limiteEstorno: "0", ativo: true });
export default function ConfiguracaoPedidosPanel() {
  const { tokenInterno, fazerLogout } = useAutenticacao();
  const [config, setConfig] = useState({ expediente: dias.map((_, diaSemana) => ({ diaSemana, aberto: false, inicio: "08:00", fim: "18:00" })), limites: [], cargos: [] });
  const [categorias, setCategorias] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [buscaFuncionario, setBuscaFuncionario] = useState("");
  const [cargo, setCargo] = useState(novoCargo);
  const [idFuncionario, setIdFuncionario] = useState("");
  const [individual, setIndividual] = useState({ idCargo: null, excecoesModulos: {}, cancelamentoIndividual: null, descontoIndividual: null, estornoIndividual: null });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function api(caminho, metodo = "GET", dados) {
    try { return await requisitarApi(caminho, metodo, dados, tokenInterno); }
    catch (falha) { if (falha.status === 401) await fazerLogout(); throw falha; }
  }
  const apiRef = useRef(api); apiRef.current = api;
  useEffect(() => {
    let vigente = true;
    const espera = setTimeout(() => apiRef.current(`/api/funcionarios?limite=100&busca=${encodeURIComponent(buscaFuncionario)}`).then((equipe) => {
      if (vigente) setFuncionarios(equipe.dados.filter((f) => f.perfilAcesso !== "GERENTE"));
    }).catch((falha) => { if (vigente) setErro(falha.message); }), 250);
    return () => { vigente = false; clearTimeout(espera); };
  }, [buscaFuncionario]);
  useEffect(() => {
    let vigente = true;
    Promise.all([apiRef.current("/api/configuracoes-pedidos"), apiRef.current("/api/categorias-produtos"), apiRef.current("/api/funcionarios?limite=100")]).then(([c, categoriasAtuais, equipe]) => {
      if (!vigente) return;
      setConfig((anterior) => ({ ...c.dados, expediente: c.dados.expediente.length ? c.dados.expediente : anterior.expediente }));
      setCategorias(categoriasAtuais.dados); setFuncionarios(equipe.dados.filter((f) => f.perfilAcesso !== "GERENTE"));
    }).catch((falha) => { if (vigente) setErro(falha.message); });
    return () => { vigente = false; };
  }, []);
  async function salvar(caminho, metodo, dados) {
    setOcupado(true); setErro(""); setSucesso("");
    try { await api(caminho, metodo, dados); setSucesso("Configuração salva."); const atual = await api("/api/configuracoes-pedidos"); setConfig(atual.dados); }
    catch (falha) { setErro(falha.message); } finally { setOcupado(false); }
  }
  return <section className="mb-6 space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Configurações de Pedidos</h2>{erro && <p role="alert" className="text-red-700">{erro}</p>}{sucesso && <p role="status">{sucesso}</p>}<fieldset disabled={ocupado} className="space-y-4">
    <h3 className="font-semibold">Expediente</h3>{config.expediente.map((dia) => <div key={dia.diaSemana} className="flex flex-wrap gap-3"><label className="w-32"><input type="checkbox" checked={dia.aberto} onChange={(e) => setConfig({ ...config, expediente: config.expediente.map((d) => d === dia ? { ...d, aberto: e.target.checked } : d) })} /> {dias[dia.diaSemana]}</label>{["inicio", "fim"].map((chave) => <input key={chave} aria-label={`${chave} ${dias[dia.diaSemana]}`} type="time" step="900" className={campo} value={dia[chave]} onChange={(e) => setConfig({ ...config, expediente: config.expediente.map((d) => d === dia ? { ...d, [chave]: e.target.value } : d) })} />)}</div>)}
    <h3 className="font-semibold">Limite por categoria por hora — vazio significa sem limite</h3>{categorias.map((c) => <label key={c.idCategoria} className="mr-4 inline-block">{c.nome}<input type="number" min="0" className={`${campo} ml-2 w-28`} value={config.limites.find((l) => String(l.idCategoria) === String(c.idCategoria))?.limite ?? ""} onChange={(e) => setConfig({ ...config, limites: [...config.limites.filter((l) => String(l.idCategoria) !== String(c.idCategoria)), ...(e.target.value === "" ? [] : [{ idCategoria: Number(c.idCategoria), limite: Number(e.target.value) }])] })} /></label>)}<div><button className={campo} onClick={() => salvar("/api/configuracoes-pedidos", "PUT", { expediente: config.expediente, limites: config.limites })}>Salvar expediente e capacidade</button></div>
    <details><summary>Cargos e limites</summary><div className="my-3 flex flex-wrap gap-2"><select className={campo} onChange={(e) => setCargo(e.target.value ? config.cargos.find((c) => c.idCargo === Number(e.target.value)) : novoCargo())}><option value="">Novo cargo</option>{config.cargos.map((c) => <option key={c.idCargo} value={c.idCargo}>{c.nome}</option>)}</select><input className={campo} placeholder="Nome do cargo" value={cargo.nome} onChange={(e) => setCargo({ ...cargo, nome: e.target.value })} /><label><input type="checkbox" checked={cargo.ativo} onChange={(e) => setCargo({ ...cargo, ativo: e.target.checked })} /> Ativo</label></div><div className="flex flex-wrap gap-3">{modulos.map((m) => <label key={m}><input type="checkbox" checked={cargo.modulos.includes(m)} onChange={(e) => setCargo({ ...cargo, modulos: e.target.checked ? [...cargo.modulos, m] : cargo.modulos.filter((atual) => atual !== m) })} /> {m}</label>)}</div><div className="my-3 flex flex-wrap gap-3"><label>Desconto (%)<input className={campo} type="number" min="0" max="100" step="0.01" value={cargo.limiteDesconto} onChange={(e) => setCargo({ ...cargo, limiteDesconto: e.target.value })} /></label><label>Estorno acumulado por pagamento (R$)<input className={campo} type="number" min="0" step="0.01" value={cargo.limiteEstorno} onChange={(e) => setCargo({ ...cargo, limiteEstorno: e.target.value })} /></label><label>Cancelar<select className={campo} value={String(cargo.podeCancelarPedido)} onChange={(e) => setCargo({ ...cargo, podeCancelarPedido: e.target.value === "null" ? null : e.target.value === "true" })}><option value="null">Padrão do perfil</option><option value="true">Permitir</option><option value="false">Negar</option></select></label></div><button className={campo} onClick={() => salvar("/api/configuracoes-pedidos/cargos", "POST", cargo)}>Salvar cargo</button></details>
    <details><summary>Cargo e exceções do funcionário</summary><label>Pesquisar funcionário<input className={campo} value={buscaFuncionario} onChange={(e) => setBuscaFuncionario(e.target.value)} /></label><select className={`${campo} my-3`} value={idFuncionario} onChange={async (e) => {
      setIdFuncionario(e.target.value);
      if (e.target.value) try { const retorno = await api(`/api/configuracoes-pedidos/funcionarios/${e.target.value}`); setIndividual(retorno.dados); } catch (falha) { setErro(falha.message); }
    }}><option value="">Selecione funcionário</option>{funcionarios.map((f) => <option key={f.idUsuario} value={f.idUsuario}>{f.nome}</option>)}</select>{idFuncionario && <><label className="block">Cargo<select className={campo} value={individual.idCargo || ""} onChange={(e) => setIndividual({ ...individual, idCargo: e.target.value ? Number(e.target.value) : null })}><option value="">Sem cargo</option>{config.cargos.map((c) => <option key={c.idCargo} value={c.idCargo}>{c.nome}</option>)}</select></label><div className="my-3 flex flex-wrap gap-3">{modulos.map((m) => <label key={m}>{m}<select className={campo} value={String(individual.excecoesModulos[m] ?? "herdar")} onChange={(e) => { const excecoes = { ...individual.excecoesModulos }; if (e.target.value === "herdar") delete excecoes[m]; else excecoes[m] = e.target.value === "true"; setIndividual({ ...individual, excecoesModulos: excecoes }); }}><option value="herdar">Herdar</option><option value="true">Conceder</option><option value="false">Negar</option></select></label>)}</div><label>Cancelar<select className={campo} value={String(individual.cancelamentoIndividual)} onChange={(e) => setIndividual({ ...individual, cancelamentoIndividual: e.target.value === "null" ? null : e.target.value === "true" })}><option value="null">Herdar</option><option value="true">Permitir</option><option value="false">Negar</option></select></label>{[["descontoIndividual", "Limite de desconto (%)"], ["estornoIndividual", "Limite de estorno (R$)"]].map(([nome, rotulo]) => <label className="mx-3" key={nome}>{rotulo}<input className={campo} placeholder="Herdar" type="number" min="0" step="0.01" value={individual[nome] ?? ""} onChange={(e) => setIndividual({ ...individual, [nome]: e.target.value || null })} /></label>)}<button className={`${campo} mt-3`} onClick={() => salvar(`/api/configuracoes-pedidos/funcionarios/${idFuncionario}`, "PUT", individual)}>Salvar cargo e exceções</button></>}</details>
  </fieldset></section>;
}
