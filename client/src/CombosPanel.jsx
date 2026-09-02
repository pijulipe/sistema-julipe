import { useState } from "react";
import { Package, PackageSearch, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCombos } from "./CombosContext";
import ComboModal, { IconeCombo } from "./ComboModal";

const formatBRL = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CombosPanel() {
  const { combos, carregandoCombos, erroCombos, paginacao, carregarCombos, salvarCombo, removerCombo } = useCombos();
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState("");
  const [modal, setModal] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const filtros = (sobrescrever = {}) => ({ busca, ativo, pagina: paginacao.pagina, ...sobrescrever });
  const pesquisar = (evento) => { evento.preventDefault(); carregarCombos(filtros({ pagina: 1 })); };

  async function handleSave(dados) {
    setSalvando(true);
    try {
      await salvarCombo(dados, modal?.combo?.id);
      setModal(null);
      await carregarCombos(filtros());
    } catch { /* O contexto apresenta o erro da API. */ }
    finally { setSalvando(false); }
  }

  async function handleDelete(evento, combo) {
    evento.stopPropagation();
    if (!window.confirm(`Excluir o combo “${combo.nome}”?`)) return;
    try { await removerCombo(combo.id); await carregarCombos(filtros({ pagina: 1 })); }
    catch { /* O contexto apresenta o erro da API. */ }
  }

  async function alternarAtividade(evento, combo) {
    evento.stopPropagation();
    try {
      await salvarCombo({ ativo: !combo.ativo }, combo.id);
      await carregarCombos(filtros());
    } catch { /* O contexto apresenta o erro da API. */ }
  }

  return <main className="mx-auto max-w-7xl px-6 py-8">
    <div className="mb-6 flex items-start justify-between">
      <div><h1 className="text-3xl font-bold text-slate-900">Combos & Kits</h1>
        <p className="mt-1 text-slate-500">{paginacao.total} combo{paginacao.total !== 1 ? "s" : ""} cadastrado{paginacao.total !== 1 ? "s" : ""}</p>
      </div>
      <button onClick={() => setModal({ mode: "create" })} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={18}/>Novo Combo</button>
    </div>

    <form onSubmit={pesquisar} className="mb-6 flex max-w-2xl gap-3">
      <div className="relative flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar combo..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
      <select value={ativo} onChange={(e) => { setAtivo(e.target.value); carregarCombos({ busca, ativo: e.target.value, pagina: 1 }); }} className="rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700"><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select>
      <button className="rounded-xl bg-slate-800 px-5 text-sm font-semibold text-white">Buscar</button>
    </form>

    {erroCombos && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erroCombos}</div>}
    {carregandoCombos ? <div className="py-16 text-center text-slate-400">Carregando combos...</div> : combos.length === 0 ?
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm"><PackageSearch size={40} className="mb-3 text-slate-300"/><p className="text-slate-400">Nenhum combo encontrado</p></div> :
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.5fr_1.8fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 px-6 py-3 text-sm text-slate-400"><span>Combo</span><span>Itens</span><span>Preço</span><span>Status</span><span className="text-right">Ações</span></div>
        {combos.map((combo, indice) => <div key={combo.id} onClick={() => setModal({ mode: "view", combo })} className={`grid cursor-pointer grid-cols-[1.5fr_1.8fr_0.8fr_0.8fr_0.8fr] items-center gap-4 px-6 py-4 hover:bg-slate-50 ${indice < combos.length - 1 ? "border-b border-slate-100" : ""}`}>
          <div className="flex items-center gap-3"><IconeCombo/><div><div className="text-sm font-semibold text-slate-900">{combo.nome}</div><div className="text-xs text-slate-400">Versão {combo.versao}</div></div></div>
          <span className="flex items-center gap-1 truncate text-sm text-slate-500"><Package size={14}/><span className="truncate">{combo.itens.map((item) => `${item.quantidade}x ${item.produto.nome}`).join(", ")}</span></span>
          <span className="text-sm font-bold text-blue-600">{formatBRL(combo.preco)}</span>
          <button onClick={(e) => alternarAtividade(e, combo)} className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${combo.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{combo.status}</button>
          <div className="flex justify-end gap-3"><button onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", combo }); }} aria-label="Editar combo" className="text-slate-400 hover:text-blue-600"><Pencil size={16}/></button><button onClick={(e) => handleDelete(e, combo)} aria-label="Excluir combo" className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button></div>
        </div>)}
      </div>}

    {paginacao.totalPaginas > 1 && <div className="mt-5 flex items-center justify-center gap-3"><button disabled={paginacao.pagina <= 1} onClick={() => carregarCombos(filtros({ pagina: paginacao.pagina - 1 }))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Anterior</button><span className="text-sm text-slate-500">Página {paginacao.pagina} de {paginacao.totalPaginas}</span><button disabled={paginacao.pagina >= paginacao.totalPaginas} onClick={() => carregarCombos(filtros({ pagina: paginacao.pagina + 1 }))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Próxima</button></div>}
    {modal && <ComboModal
      mode={modal.mode} combo={modal.combo} onClose={() => setModal(null)}
      onSave={handleSave} salvando={salvando} erro={erroCombos}
      onRequestEdit={() => setModal({ mode: "edit", combo: modal.combo })}
    />}
  </main>;
}
