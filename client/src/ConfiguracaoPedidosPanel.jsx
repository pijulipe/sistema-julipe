import React, { useEffect, useRef, useState } from "react";
import { AlarmClock, ChevronRight, Clock } from "lucide-react";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { requisitarApi } from "./services/apiService.js";

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const modulos = ["PEDIDOS", "PRODUCAO", "PRODUTO", "COMBOS", "RELATORIO", "CLIENTES", "ESTOQUE", "EXPEDICAO", "FUNCIONARIOS"];
const campo = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const campoPequeno = "w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const botaoSec = "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 px-4 py-2.5 text-sm border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800";
const caixa = "h-4 w-4 rounded accent-slate-800";
const horas = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const novoCargo = () => ({ nome: "", modulos: [], podeCancelarPedido: null, limiteDesconto: "0", limiteEstorno: "0", ativo: true });

/* Horário sempre em 24h (HH:MM), de 15 em 15 minutos — igual ao step="900" anterior. */
function CampoHorario({ valor, rotulo, onChange }) {
  const [hora = "08", minuto = "00"] = (valor || "08:00").split(":");
  const h = hora.padStart(2, "0");
  const minutos = ["00", "15", "30", "45"];
  if (!minutos.includes(minuto)) minutos.push(minuto);
  const seletor = "cursor-pointer appearance-none bg-transparent text-center focus:outline-none";
  return <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
    <Clock size={14} className="text-slate-500" aria-hidden="true" />
    <span className="flex items-center">
      <select aria-label={`${rotulo} — hora`} className={seletor} value={h} onChange={(e) => onChange(`${e.target.value}:${minuto}`)}>{horas.map((v) => <option key={v}>{v}</option>)}</select>
      <span aria-hidden="true">:</span>
      <select aria-label={`${rotulo} — minuto`} className={seletor} value={minuto} onChange={(e) => onChange(`${h}:${e.target.value}`)}>{minutos.map((v) => <option key={v}>{v}</option>)}</select>
    </span>
    <Clock size={14} className="text-slate-800" aria-hidden="true" />
  </div>;
}

/* Rótulo acima do campo: mantém tudo alinhado em colunas. */
function Campo({ rotulo, children }) {
  return <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">{rotulo}{children}</label>;
}

function Secao({ titulo, children }) {
  return <details className="group rounded-xl border border-slate-200 p-4">
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
      <ChevronRight size={15} aria-hidden="true" className="transition-transform group-open:rotate-90" />{titulo}
    </summary>
    <div className="mt-4 space-y-3">{children}</div>
  </details>;
}

export default function ConfiguracaoPedidosPanel({ onClose = () => {} }) {
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
  const dialogoRef = useRef(null);

  async function api(caminho, metodo = "GET", dados) {
    try { return await requisitarApi(caminho, metodo, dados, tokenInterno); }
    catch (falha) { if (falha.status === 401) await fazerLogout(); throw falha; }
  }
  const apiRef = useRef(api); apiRef.current = api;

  // Janela modal: foco ao abrir, rolagem da página travada e Esc para fechar.
  useEffect(() => {
    dialogoRef.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, []);
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape" && !ocupado) onClose(); };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [ocupado, onClose]);

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

  const alterarDia = (dia, parte) => setConfig({ ...config, expediente: config.expediente.map((d) => d === dia ? { ...d, ...parte } : d) });
  const limiteDe = (c) => config.limites.find((l) => String(l.idCategoria) === String(c.idCategoria))?.limite ?? "";
  const alterarLimite = (c, valor) => setConfig({ ...config, limites: [...config.limites.filter((l) => String(l.idCategoria) !== String(c.idCategoria)), ...(valor === "" ? [] : [{ idCategoria: Number(c.idCategoria), limite: Number(valor) }])] });

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onClose(); }}>
    <section ref={dialogoRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="titulo-configuracoes" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><AlarmClock size={18} aria-hidden="true" /></span>
        <h2 id="titulo-configuracoes" className="text-lg font-bold text-slate-900">Configurações de Pedidos</h2>
      </header>
      {erro && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
      {sucesso && <p role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{sucesso}</p>}

      <fieldset disabled={ocupado} className="min-w-0 space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Expediente</h3>
          <div className="space-y-2">{config.expediente.map((dia) => <div key={dia.diaSemana} className="grid grid-cols-3 items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" className={caixa} checked={dia.aberto} onChange={(e) => alterarDia(dia, { aberto: e.target.checked })} />{dias[dia.diaSemana]}</label>
            <div className="justify-self-center"><CampoHorario rotulo={`Início ${dias[dia.diaSemana]}`} valor={dia.inicio} onChange={(v) => alterarDia(dia, { inicio: v })} /></div>
            <div className="justify-self-end"><CampoHorario rotulo={`Fim ${dias[dia.diaSemana]}`} valor={dia.fim} onChange={(v) => alterarDia(dia, { fim: v })} /></div>
          </div>)}</div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Limite por categoria por hora</h3>
          <p className="mb-3 text-xs text-slate-400">Vazio significa sem limite</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{categorias.map((c) => <label key={c.idCategoria} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{c.nome}<input type="number" min="0" className={campoPequeno} value={limiteDe(c)} onChange={(e) => alterarLimite(c, e.target.value)} /></label>)}</div>
        </div>

        <Secao titulo="Cargos e limites">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1.6fr_auto]">
            <Campo rotulo="Cargo"><select className={campo} value={cargo.idCargo ?? ""} onChange={(e) => setCargo(e.target.value ? config.cargos.find((c) => c.idCargo === Number(e.target.value)) : novoCargo())}><option value="">Novo cargo</option>{config.cargos.map((c) => <option key={c.idCargo} value={c.idCargo}>{c.nome}</option>)}</select></Campo>
            <Campo rotulo="Nome do cargo"><input className={campo} placeholder="Nome do cargo" value={cargo.nome} onChange={(e) => setCargo({ ...cargo, nome: e.target.value })} /></Campo>
            <label className="flex h-[42px] items-center gap-2 text-sm text-slate-700"><input type="checkbox" className={caixa} checked={cargo.ativo} onChange={(e) => setCargo({ ...cargo, ativo: e.target.checked })} />Ativo</label>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Módulos com acesso</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-700 sm:grid-cols-3">{modulos.map((m) => <label key={m} className="flex items-center gap-2"><input type="checkbox" className={caixa} checked={cargo.modulos.includes(m)} onChange={(e) => setCargo({ ...cargo, modulos: e.target.checked ? [...cargo.modulos, m] : cargo.modulos.filter((atual) => atual !== m) })} />{m}</label>)}</div>
          </div>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
            <Campo rotulo="Desconto (%)"><input className={campo} type="number" min="0" max="100" step="0.01" value={cargo.limiteDesconto} onChange={(e) => setCargo({ ...cargo, limiteDesconto: e.target.value })} /></Campo>
            <Campo rotulo="Estorno acumulado por pagamento (R$)"><input className={campo} type="number" min="0" step="0.01" value={cargo.limiteEstorno} onChange={(e) => setCargo({ ...cargo, limiteEstorno: e.target.value })} /></Campo>
            <Campo rotulo="Cancelar pedido"><select className={campo} value={String(cargo.podeCancelarPedido)} onChange={(e) => setCargo({ ...cargo, podeCancelarPedido: e.target.value === "null" ? null : e.target.value === "true" })}><option value="null">Padrão do perfil</option><option value="true">Permitir</option><option value="false">Negar</option></select></Campo>
          </div>
          <button type="button" disabled={!cargo.nome.trim()} className={botaoSec} onClick={() => salvar("/api/configuracoes-pedidos/cargos", "POST", cargo)}>Salvar cargo</button>
        </Secao>

        <Secao titulo="Cargo e exceções do funcionário">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
            <Campo rotulo="Pesquisar funcionário"><input className={campo} value={buscaFuncionario} onChange={(e) => setBuscaFuncionario(e.target.value)} /></Campo>
            <Campo rotulo="Funcionário"><select className={campo} value={idFuncionario} onChange={async (e) => {
              setIdFuncionario(e.target.value);
              if (e.target.value) try { const retorno = await api(`/api/configuracoes-pedidos/funcionarios/${e.target.value}`); setIndividual(retorno.dados); } catch (falha) { setErro(falha.message); }
            }}><option value="">Selecione funcionário</option>{funcionarios.map((f) => <option key={f.idUsuario} value={f.idUsuario}>{f.nome}</option>)}</select></Campo>
          </div>
          {idFuncionario && <div className="space-y-4">
            <Campo rotulo="Cargo"><select className={campo} value={individual.idCargo || ""} onChange={(e) => setIndividual({ ...individual, idCargo: e.target.value ? Number(e.target.value) : null })}><option value="">Sem cargo</option>{config.cargos.map((c) => <option key={c.idCargo} value={c.idCargo}>{c.nome}</option>)}</select></Campo>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Exceções por módulo</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{modulos.map((m) => <Campo key={m} rotulo={m}><select className={campo} value={String(individual.excecoesModulos[m] ?? "herdar")} onChange={(e) => { const excecoes = { ...individual.excecoesModulos }; if (e.target.value === "herdar") delete excecoes[m]; else excecoes[m] = e.target.value === "true"; setIndividual({ ...individual, excecoesModulos: excecoes }); }}><option value="herdar">Herdar</option><option value="true">Conceder</option><option value="false">Negar</option></select></Campo>)}</div>
            </div>
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
              <Campo rotulo="Cancelar pedido"><select className={campo} value={String(individual.cancelamentoIndividual)} onChange={(e) => setIndividual({ ...individual, cancelamentoIndividual: e.target.value === "null" ? null : e.target.value === "true" })}><option value="null">Herdar</option><option value="true">Permitir</option><option value="false">Negar</option></select></Campo>
              {[["descontoIndividual", "Limite de desconto (%)"], ["estornoIndividual", "Limite de estorno (R$)"]].map(([nome, rotulo]) => <Campo key={nome} rotulo={rotulo}><input className={campo} placeholder="Herdar" type="number" min="0" step="0.01" value={individual[nome] ?? ""} onChange={(e) => setIndividual({ ...individual, [nome]: e.target.value || null })} /></Campo>)}
            </div>
            <button type="button" className={botaoSec} onClick={() => salvar(`/api/configuracoes-pedidos/funcionarios/${idFuncionario}`, "PUT", individual)}>Salvar cargo e exceções</button>
          </div>}
        </Secao>
      </fieldset>

      <footer className="mt-6 flex gap-3">
        <button type="button" disabled={ocupado} onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 px-4 py-3 text-sm border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex-1">Fechar</button>
        <button type="button" disabled={ocupado} onClick={() => salvar("/api/configuracoes-pedidos", "PUT", { expediente: config.expediente, limites: config.limites })} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Salvar expediente e capacidade</button>
      </footer>
    </section>
  </div>;
}
