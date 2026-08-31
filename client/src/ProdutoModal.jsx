import { useMemo, useState } from "react";
import { Cake, Candy, Check, CupSoda, Image as ImageIcon, PartyPopper, Pencil, Sandwich, Snowflake, X } from "lucide-react";
import { useProdutos } from "./ProdutosContext.jsx";

export const unidades = ["Unidade", "Kg", "Litro", "Pacote", "Fatia"];
const icones = { Bolos: Cake, Doces: Candy, Salgados: Sandwich, Bebidas: CupSoda, Congelados: Snowflake, Festas: PartyPopper };

export function IconeProduto({ categoria, imagem, size = 36 }) {
  if (imagem) return <img src={imagem} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  const Icone = icones[categoria] || Cake;
  return <div className="flex shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600" style={{ width: size, height: size }}><Icone size={size * 0.5} /></div>;
}

const campoVazio = {
  nome: "", idCategoria: "", unidadeMedida: "Unidade", multiploMinimo: "1",
  precoUnitario: "", tempoPreparoMinutos: "0", descricao: "", ativo: true,
  caminhoImagem: null, imagemUrl: null, arquivoImagem: null,
};

export default function ProdutoModal({ mode, produto, onClose, onSave, onRequestEdit }) {
  const { categorias } = useProdutos();
  const [dados, setDados] = useState(() => produto ? {
    nome: produto.nome,
    idCategoria: produto.categoria.idCategoria,
    unidadeMedida: produto.unidadeMedida,
    multiploMinimo: String(produto.multiploMinimo),
    precoUnitario: String(produto.precoUnitario),
    tempoPreparoMinutos: String(produto.tempoPreparoMinutos),
    descricao: produto.descricao || "",
    ativo: produto.ativo,
    caminhoImagem: produto.caminhoImagem,
    imagemUrl: produto.imagemUrl,
    arquivoImagem: null,
  } : { ...campoVazio, idCategoria: categorias[0]?.idCategoria || "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const categoria = useMemo(() => categorias.find((item) => String(item.idCategoria) === String(dados.idCategoria)), [categorias, dados.idCategoria]);

  const alterar = (campo) => (evento) => setDados((atual) => ({ ...atual, [campo]: evento.target.value }));
  function alterarCategoria(evento) {
    const selecionada = categorias.find((item) => String(item.idCategoria) === evento.target.value);
    setDados((atual) => ({
      ...atual,
      idCategoria: evento.target.value,
      multiploMinimo: String(selecionada?.unidadesPorPacotePadrao || 1),
      ...(!selecionada?.permiteImagem && { caminhoImagem: null, imagemUrl: null, arquivoImagem: null }),
    }));
  }

  function selecionarImagem(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type)) return setErro("Use PNG, JPG/JPEG ou WebP.");
    if (arquivo.size > 5 * 1024 * 1024) return setErro("A foto deve possuir no máximo 5 MB.");
    if (dados.imagemUrl?.startsWith("blob:")) URL.revokeObjectURL(dados.imagemUrl);
    setErro("");
    setDados((atual) => ({ ...atual, arquivoImagem: arquivo, imagemUrl: URL.createObjectURL(arquivo) }));
  }

  async function salvar() {
    if (!dados.nome.trim() || !dados.idCategoria) return setErro("Preencha nome e categoria.");
    setSalvando(true);
    setErro("");
    try {
      await onSave({
        nome: dados.nome.trim(),
        idCategoria: Number(dados.idCategoria),
        unidadeMedida: dados.unidadeMedida,
        multiploMinimo: Number(dados.multiploMinimo),
        precoUnitario: Number(dados.precoUnitario),
        tempoPreparoMinutos: Number(dados.tempoPreparoMinutos),
        descricao: dados.descricao.trim() || null,
        ativo: dados.ativo,
        caminhoImagem: categoria?.permiteImagem ? dados.caminhoImagem : null,
        arquivoImagem: categoria?.permiteImagem ? dados.arquivoImagem : null,
      });
    } catch (falha) {
      setErro(falha?.message || "Não foi possível salvar o produto.");
    } finally { setSalvando(false); }
  }

  if (mode === "view" && produto) return <Janela onClose={onClose} titulo={produto.nome}>
    {produto.imagemUrl && <img src={produto.imagemUrl} alt={produto.nome} className="h-40 w-full rounded-xl object-cover" />}
    <div className="space-y-3 text-sm">
      <Linha rotulo="Categoria" valor={produto.categoria.nome} />
      <Linha rotulo="Unidade" valor={produto.unidadeMedida} />
      <Linha rotulo="Unidades por pacote" valor={produto.multiploMinimo} />
      <Linha rotulo="Preço" valor={Number(produto.precoUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
      <Linha rotulo="Tempo de preparo" valor={`${produto.tempoPreparoMinutos} min`} />
      <Linha rotulo="Situação" valor={produto.ativo ? "Ativo" : "Inativo"} />
      <p className="border-t border-slate-100 pt-3 text-slate-600">{produto.descricao || "Sem descrição."}</p>
    </div>
    <button onClick={onRequestEdit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"><Pencil size={15} /> Editar Produto</button>
  </Janela>;

  return <Janela onClose={onClose} titulo={mode === "edit" ? "Editar Produto" : "Novo Produto"}>
    {erro && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</div>}
    <Campo rotulo="Nome"><input value={dados.nome} onChange={alterar("nome")} className="entrada" /></Campo>
    <div className="grid grid-cols-2 gap-3">
      <Campo rotulo="Categoria"><select value={dados.idCategoria} onChange={alterarCategoria} className="entrada">{categorias.map((item) => <option key={item.idCategoria} value={item.idCategoria}>{item.nome}</option>)}</select></Campo>
      <Campo rotulo="Unidade"><select value={dados.unidadeMedida} onChange={alterar("unidadeMedida")} className="entrada">{unidades.map((item) => <option key={item}>{item}</option>)}</select></Campo>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Campo rotulo="Unidades por pacote"><input type="number" min="1" step="1" value={dados.multiploMinimo} onChange={alterar("multiploMinimo")} className="entrada" /></Campo>
      <Campo rotulo="Preço (R$)"><input type="number" min="0" step="0.01" value={dados.precoUnitario} onChange={alterar("precoUnitario")} className="entrada" /></Campo>
    </div>
    <Campo rotulo="Tempo de preparo (minutos)"><input type="number" min="0" step="1" value={dados.tempoPreparoMinutos} onChange={alterar("tempoPreparoMinutos")} className="entrada" /></Campo>
    <Campo rotulo="Descrição"><textarea rows="3" value={dados.descricao} onChange={alterar("descricao")} className="entrada resize-none" /></Campo>
    {categoria?.permiteImagem && <Campo rotulo="Foto do produto">
      <div className="flex items-center gap-3">{dados.imagemUrl ? <img src={dados.imagemUrl} alt="Prévia" className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed text-slate-300"><ImageIcon /></div>}
        <label className="cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600">Escolher foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionarImagem} className="hidden" /></label>
        {(dados.caminhoImagem || dados.arquivoImagem) && <button type="button" onClick={() => setDados((atual) => ({ ...atual, caminhoImagem: null, imagemUrl: null, arquivoImagem: null }))} className="text-sm text-red-600">Remover</button>}
      </div><p className="mt-1 text-xs text-slate-400">PNG, JPG/JPEG ou WebP, até 5 MB.</p>
    </Campo>}
    <button type="button" onClick={() => setDados((atual) => ({ ...atual, ativo: !atual.ativo }))} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${dados.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}><Check size={15} />{dados.ativo ? "Ativo para venda" : "Inativo"}</button>
    <div className="flex gap-3"><button onClick={onClose} className="flex-1 rounded-xl border py-3 text-sm font-semibold">Cancelar</button><button onClick={salvar} disabled={salvando} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50">{salvando ? "Salvando..." : "Salvar"}</button></div>
  </Janela>;
}

function Janela({ titulo, onClose, children }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}><div className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(evento) => evento.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{titulo}</h2><button onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>{children}</div></div>; }
function Campo({ rotulo, children }) { return <label className="block text-sm font-medium text-slate-700">{rotulo}<div className="mt-1.5">{children}</div></label>; }
function Linha({ rotulo, valor }) { return <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">{rotulo}</span><span>{valor}</span></div>; }
