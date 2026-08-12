import React, { useEffect, useState } from "react";
import { X, Pencil, Tag, Package, Plus, Check } from "lucide-react";
import { useProdutos } from "./ProdutosContext";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const emptyForm = {
  nome: "",
  descricao: "",
  preco: "",
  itens: [], // [{ idProduto, quantidade }]
  ativo: true,
};

/**
 * mode: "view" | "edit" | "create"
 * combo: obrigatório para "view" e "edit"
 */
export default function ComboModal({ mode, combo, onClose, onSave, onRequestEdit }) {
  const { produtos } = useProdutos();
  const isForm = mode === "edit" || mode === "create";

  const [form, setForm] = useState(() =>
    mode === "edit" && combo
      ? {
          nome: combo.nome,
          descricao: combo.descricao || "",
          preco: String(combo.preco),
          itens: combo.itens.map((i) => ({ ...i })),
          ativo: combo.status !== "Inativo",
        }
      : emptyForm
  );

  const [idProdutoSelecionado, setIdProdutoSelecionado] = useState("");
  const [pickerQty, setPickerQty] = useState(1);

  // Enquanto autoPrice estiver true, o preço acompanha a soma dos produtos.
  // Assim que o usuário digitar manualmente, para de sincronizar.
  const [autoPrice, setAutoPrice] = useState(mode !== "edit");

  const nomeProduto = (id) =>
    produtos.find((p) => p.id === id)?.nome || "Produto removido";

  const precoProduto = (id) => produtos.find((p) => p.id === id)?.preco || 0;

  const itemsSum = form.itens.reduce(
    (sum, item) => sum + precoProduto(item.idProduto) * item.quantidade,
    0
  );

  useEffect(() => {
    if (!autoPrice) return;
    setForm((prev) => ({
      ...prev,
      preco: itemsSum > 0 ? String(itemsSum) : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSum, autoPrice]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePriceChange = (e) => {
    setAutoPrice(false);
    setForm((prev) => ({ ...prev, preco: e.target.value }));
  };

  const handleAdicionarItem = () => {
    if (!idProdutoSelecionado) return;
    const id = Number(idProdutoSelecionado);
    const quantidade = Math.max(1, Number(pickerQty) || 1);

    setForm((prev) => {
      const existing = prev.itens.find((i) => i.idProduto === id);
      if (existing) {
        return {
          ...prev,
          itens: prev.itens.map((i) =>
            i.idProduto === id ? { ...i, quantidade: i.quantidade + quantidade } : i
          ),
        };
      }
      return { ...prev, itens: [...prev.itens, { idProduto: id, quantidade }] };
    });
    setIdProdutoSelecionado("");
    setPickerQty(1);
  };

  const handleItemQtyChange = (idProduto, quantidade) => {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.map((i) =>
        i.idProduto === idProduto
          ? { ...i, quantidade: Math.max(1, Number(quantidade) || 1) }
          : i
      ),
    }));
  };

  const handleRemoveItem = (idProduto) => {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.filter((i) => i.idProduto !== idProduto),
    }));
  };

  const handleSubmit = () => {
    if (!form.nome.trim() || form.itens.length === 0) return;
    onSave({
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: Number(form.preco) || 0,
      itens: form.itens,
      status: form.ativo ? "Ativo" : "Inativo",
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
        {mode === "view" && combo && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <IconeCombo />
                <span className="text-lg font-bold text-slate-900">
                  {combo.nome}
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

            <div className="space-y-4 px-6 py-5">
              {combo.descricao && (
                <p className="text-sm text-slate-500">{combo.descricao}</p>
              )}

              <Row
                label="Preço"
                value={
                  <span className="font-bold text-blue-600">
                    {formatBRL(combo.preco)}
                  </span>
                }
              />
              <Row
                label="Status"
                value={
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      combo.status === "Ativo"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {combo.status}
                  </span>
                }
              />

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Itens do Combo
                </div>
                <div className="space-y-2">
                  {combo.itens.map((item) => (
                    <div
                      key={item.idProduto}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2 text-slate-700">
                        <Package size={15} className="text-slate-400" />
                        {nomeProduto(item.idProduto)}
                      </span>
                      <span className="font-medium text-slate-500">
                        {item.quantidade}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={onRequestEdit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Pencil size={15} />
                Editar Combo
              </button>
            </div>
          </>
        )}

        {/* ---------- Modo edição / criação ---------- */}
        {isForm && (
          <>
            <div className="px-6 pt-6">
              <h2 className="text-xl font-bold text-slate-900">
                {mode === "edit" ? "Editar Combo" : "Novo Combo"}
              </h2>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <Field label="Nome *">
                <input
                  value={form.nome}
                  onChange={handleChange("nome")}
                  placeholder="Nome do combo"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Descrição">
                <input
                  value={form.descricao}
                  onChange={handleChange("descricao")}
                  placeholder="Descrição do combo..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Preço do Combo (R$) *">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco}
                  onChange={handlePriceChange}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.itens.length > 0 && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Soma dos produtos selecionados:{" "}
                    <span className="font-semibold text-slate-600">
                      {formatBRL(itemsSum)}
                    </span>
                    {!autoPrice && (
                      <>
                        {" — "}
                        <button
                          type="button"
                          onClick={() => setAutoPrice(true)}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          usar este valor
                        </button>
                      </>
                    )}
                  </p>
                )}
              </Field>

              <Field label="Produtos do Combo">
                <div className="flex items-center gap-2">
                  <select
                    value={idProdutoSelecionado}
                    onChange={(e) => setIdProdutoSelecionado(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecionar produto...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={pickerQty}
                    onChange={(e) => setPickerQty(e.target.value)}
                    className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAdicionarItem}
                    disabled={!idProdutoSelecionado}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Adicionar produto"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </Field>

              {form.itens.length > 0 && (
                <div className="space-y-2">
                  {form.itens.map((item) => (
                    <div
                      key={item.idProduto}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <Package size={15} className="text-slate-400" />
                        {nomeProduto(item.idProduto)}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) =>
                            handleItemQtyChange(item.idProduto, e.target.value)
                          }
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.idProduto)}
                          className="text-slate-400 transition-colors hover:text-red-600"
                          aria-label="Remover produto do combo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
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

            <div className="flex gap-3 px-6 pb-6 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.nome.trim() || form.itens.length === 0}
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

export function IconeCombo({ size = 36 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: "#ede9fe", width: size, height: size }}
    >
      <Tag size={size * 0.5} style={{ color: "#7c3aed" }} />
    </div>
  );
}
