import React, { useState } from "react";
import { X, Pencil, Check, Image as ImageIcon } from "lucide-react";
import {
  categorias,
  unidades,
  obterCategoriaInfo,
  categoriaAceitaImagem,
} from "./categoriasProdutos";
import { useProdutos } from "./ProdutosContext";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const emptyForm = {
  nome: "",
  categoria: categorias[0].key,
  unidade: unidades[0],
  unidadesPorPacote: String(categorias[0].unidadesPorPacotePadrao || 1),
  preco: "",
  descricao: "",
  ativo: true,
  imagem: null,
};

/**
 * mode: "view" | "edit" | "create"
 * produto: obrigatório para "view" e "edit"
 */
export default function ProdutoModal({ mode, produto, onClose, onSave, onRequestEdit }) {
  const { buscarProdutoPorNome } = useProdutos();
  const isForm = mode === "edit" || mode === "create";

  const [form, setForm] = useState(() =>
    mode === "edit" && produto
      ? {
          nome: produto.nome,
          categoria: produto.categoria,
          unidade: produto.unidade,
          unidadesPorPacote: String(produto.unidadesPorPacote || 1),
          preco: String(produto.preco),
          descricao: produto.descricao || "",
          ativo: produto.status !== "Inativo",
          imagem: produto.imagem || null,
        }
      : emptyForm
  );
  const [error, setError] = useState("");

  // Enquanto autoUnits estiver true (só ao criar), a quantidade por pacote
  // acompanha o padrão da categoria escolhida. Assim que o usuário digitar
  // manualmente, para de sincronizar — igual ao preço no ComboModal.
  const [autoUnits, setAutoUnits] = useState(mode !== "edit");

  const handleChange = (field) => (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAlterarCategoria = (e) => {
    const novaCategoria = e.target.value;
    setError("");
    setForm((prev) => ({
      ...prev,
      categoria: novaCategoria,
      unidadesPorPacote:
        autoUnits && prev.unidade === "Unidade"
          ? String(obterCategoriaInfo(novaCategoria).unidadesPorPacotePadrao || 1)
          : prev.unidadesPorPacote,
    }));
  };

  const handleUnitChange = (e) => {
    const novaUnidade = e.target.value;
    setError("");
    setForm((prev) => ({
      ...prev,
      unidade: novaUnidade,
      // "Unidades por pacote" só faz sentido quando o produto é vendido
      // por Unidade (ex: salgados vendidos 1 a 1, mas produzidos em
      // pacotes de 25). Para Kg, Litro, Pacote ou Fatia, o multiplicador
      // não se aplica — volta pro padrão (1) e o campo fica escondido.
      unidadesPorPacote: novaUnidade === "Unidade" ? prev.unidadesPorPacote : "1",
    }));
  };

  const handleUnitsPerPackageChange = (e) => {
    setAutoUnits(false);
    setError("");
    setForm((prev) => ({ ...prev, unidadesPorPacote: e.target.value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, imagem: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, imagem: null }));
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) return;

    const duplicate = buscarProdutoPorNome(
      form.nome,
      mode === "edit" ? produto?.id : undefined
    );
    if (duplicate) {
      setError(`Já existe um produto cadastrado com esse nome: ${duplicate.nome}`);
      return;
    }

    onSave({
      nome: form.nome.trim(),
      categoria: form.categoria,
      unidade: form.unidade,
      unidadesPorPacote: Math.max(1, Number(form.unidadesPorPacote) || 1),
      preco: Number(form.preco) || 0,
      descricao: form.descricao.trim(),
      status: form.ativo ? "Ativo" : "Inativo",
      imagem: categoriaAceitaImagem(form.categoria) ? form.imagem || null : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- Modo visualização ---------- */}
        {mode === "view" && produto && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <IconeProduto
                  categoria={produto.categoria}
                  imagem={produto.imagem}
                  size={40}
                />
                <span className="text-lg font-bold text-slate-900">
                  {produto.nome}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {produto.imagem && (
              <div className="px-6 pt-5">
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className="h-40 w-full rounded-xl object-cover"
                />
              </div>
            )}

            <div className="space-y-4 px-6 py-5">
              <Row label="Categoria" value={produto.categoria} />
              <Row
                label="Preço"
                value={
                  <span className="font-bold text-blue-600">
                    {formatBRL(produto.preco)}{" "}
                    <span className="text-sm font-normal text-slate-400">
                      /{" "}
                      {produto.unidadesPorPacote > 1
                        ? `pacote (${produto.unidadesPorPacote} un.)`
                        : produto.unidade.toLowerCase()}
                    </span>
                  </span>
                }
              />
              {produto.unidadesPorPacote > 1 && (
                <Row
                  label="Unidades por pacote"
                  value={`${produto.unidadesPorPacote} unidades`}
                />
              )}
              <Row
                label="Status"
                value={
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      produto.status === "Ativo"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {produto.status}
                  </span>
                }
              />

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-1 text-sm text-slate-500">Descrição</div>
                <p className="text-sm text-slate-700">
                  {produto.descricao || "Sem descrição."}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={onRequestEdit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Pencil size={15} />
                Editar Produto
              </button>
            </div>
          </>
        )}

        {/* ---------- Modo edição / criação ---------- */}
        {isForm && (
          <>
            <div className="px-6 pt-6">
              <h2 className="text-xl font-bold text-slate-900">
                {mode === "edit" ? "Editar Produto" : "Novo Produto"}
              </h2>
            </div>

            <div className="space-y-4 px-6 py-5">
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Field label="Nome">
                <input
                  value={form.nome}
                  onChange={handleChange("nome")}
                  placeholder="Nome do produto"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Categoria">
                  <select
                    value={form.categoria}
                    onChange={handleAlterarCategoria}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categorias.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Unidade">
                  <select
                    value={form.unidade}
                    onChange={handleUnitChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {unidades.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {form.unidade === "Unidade" && (
                <Field label="Unidades por pacote">
                  <input
                    type="number"
                    min="1"
                    value={form.unidadesPorPacote}
                    onChange={handleUnitsPerPackageChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Quantas unidades reais equivalem a 1 unidade de estoque. Ex:
                    salgados vendidos em pacotes de 25.
                  </p>
                </Field>
              )}

              {categoriaAceitaImagem(form.categoria) && (
                <Field label="Foto do produto">
                  <div className="flex items-center gap-4">
                    {form.imagem ? (
                      <div className="relative shrink-0">
                        <img
                          src={form.imagem}
                          alt=""
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition-colors hover:text-red-600"
                          aria-label="Remover foto"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                      {form.imagem ? "Trocar foto" : "Adicionar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Disponível apenas para Bolos e Doces.
                  </p>
                </Field>
              )}

              <Field label="Preço (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco}
                  onChange={handleChange("preco")}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Descrição">
                <textarea
                  value={form.descricao}
                  onChange={handleChange("descricao")}
                  placeholder="Descrição do produto..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, ativo: !prev.ativo }))
                }
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  form.ativo
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Check size={15} />
                {form.ativo ? "Ativo para venda" : "Inativo"}
              </button>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.nome.trim()}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode === "edit" ? "Salvar" : "Criar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export function IconeProduto({ categoria, imagem, size = 36 }) {
  if (imagem) {
    return (
      <img
        src={imagem}
        alt=""
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const meta = obterCategoriaInfo(categoria);
  const Icon = meta.icon;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{
        backgroundColor: meta.bg,
        width: size,
        height: size,
      }}
    >
      <Icon size={size * 0.5} style={{ color: meta.color }} />
    </div>
  );
}
