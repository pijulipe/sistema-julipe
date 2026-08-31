import { useEffect, useRef, useState } from "react";
import { PackageSearch, Pencil, Plus, Search, Trash2 } from "lucide-react";
import ProdutoModal, { IconeProduto } from "./ProdutoModal.jsx";
import { useProdutos } from "./ProdutosContext.jsx";

const formatarPreco = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProdutosPanel() {
  const { produtos, categorias, carregandoProdutos, erroProdutos, paginacao, carregarProdutos, salvarProduto, removerProduto } = useProdutos();
  const [busca, setBusca] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [atividade, setAtividade] = useState("");
  const [modal, setModal] = useState(null);
  const [erroOperacao, setErroOperacao] = useState("");
  const carregarRef = useRef(carregarProdutos);
  useEffect(() => { carregarRef.current = carregarProdutos; }, [carregarProdutos]);
  useEffect(() => {
    const temporizador = setTimeout(() => carregarRef.current({
      busca, idCategoria, ativo: atividade, pagina: 1, limite: paginacao.limite,
    }), 300);
    return () => clearTimeout(temporizador);
  }, [busca, idCategoria, atividade, paginacao.limite]);

  const filtros = (pagina = paginacao.pagina) => ({ busca, idCategoria, ativo: atividade, pagina, limite: paginacao.limite });
  async function salvar(dados) {
    const idProduto = modal?.mode === "edit" ? modal.produto.idProduto : undefined;
    await salvarProduto(dados, idProduto);
    await carregarProdutos(filtros());
    setModal(null);
  }
  async function excluir(evento, idProduto) {
    evento.stopPropagation();
    setErroOperacao("");
    try {
      await removerProduto(idProduto);
      await carregarProdutos(filtros(produtos.length === 1 && paginacao.pagina > 1 ? paginacao.pagina - 1 : paginacao.pagina));
    } catch (erro) { setErroOperacao(erro?.message || "Não foi possível excluir o produto."); }
  }

  return <main className="mx-auto max-w-7xl px-6 py-8">
    <div className="mb-6 flex items-start justify-between"><div><h1 className="text-3xl font-bold text-slate-900">Produtos</h1><p className="mt-1 text-slate-500">{paginacao.total} produto{paginacao.total !== 1 ? "s" : ""} cadastrado{paginacao.total !== 1 ? "s" : ""}</p></div><button onClick={() => setModal({ mode: "create" })} disabled={!categorias.length} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Plus size={18} /> Novo Produto</button></div>
    <div className="mb-6 flex flex-wrap gap-3"><div className="relative min-w-60 flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar por nome..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm" /></div><select value={idCategoria} onChange={(evento) => setIdCategoria(evento.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Todas as categorias</option>{categorias.map((item) => <option key={item.idCategoria} value={item.idCategoria}>{item.nome}</option>)}</select><select value={atividade} onChange={(evento) => setAtividade(evento.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Ativos e inativos</option><option value="true">Ativos</option><option value="false">Inativos</option></select></div>
    {(erroOperacao || erroProdutos) && <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erroOperacao || erroProdutos}</div>}
    {carregandoProdutos ? <Estado texto="Carregando produtos..." /> : produtos.length === 0 ? <Estado texto={busca ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"} icone /> : <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr] gap-4 border-b px-6 py-3 text-sm text-slate-400"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Situação</span><span className="text-right">Ações</span></div>{produtos.map((produto) => <div key={produto.idProduto} onClick={() => setModal({ mode: "view", produto })} className="grid cursor-pointer grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr] items-center gap-4 border-b px-6 py-4 last:border-0 hover:bg-slate-50"><div className="flex items-center gap-3"><IconeProduto categoria={produto.categoria.nome} imagem={produto.imagemUrl} /><div><p className="font-semibold text-slate-900">{produto.nome}</p><p className="line-clamp-1 text-xs text-slate-400">{produto.descricao}</p></div></div><span className="text-sm text-slate-600">{produto.categoria.nome}</span><span className="text-sm font-semibold">{formatarPreco(produto.precoUnitario)}</span><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${produto.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{produto.ativo ? "Ativo" : "Inativo"}</span><div className="flex justify-end gap-3"><button onClick={(evento) => { evento.stopPropagation(); setModal({ mode: "edit", produto }); }} aria-label="Editar"><Pencil size={16} /></button><button onClick={(evento) => excluir(evento, produto.idProduto)} aria-label="Excluir" className="hover:text-red-600"><Trash2 size={16} /></button></div></div>)}</div>}
    {!carregandoProdutos && paginacao.totalPaginas > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button disabled={paginacao.pagina <= 1} onClick={() => carregarProdutos(filtros(paginacao.pagina - 1))} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">Anterior</button><span className="text-sm text-slate-500">Página {paginacao.pagina} de {paginacao.totalPaginas}</span><button disabled={paginacao.pagina >= paginacao.totalPaginas} onClick={() => carregarProdutos(filtros(paginacao.pagina + 1))} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">Próxima</button></div>}
    {modal && <ProdutoModal mode={modal.mode} produto={modal.produto} onClose={() => setModal(null)} onSave={salvar} onRequestEdit={() => setModal({ mode: "edit", produto: modal.produto })} />}
  </main>;
}

function Estado({ texto, icone }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400 shadow-sm">{icone && <PackageSearch size={40} className="mb-3 text-slate-300" />}{texto}</div>; }
