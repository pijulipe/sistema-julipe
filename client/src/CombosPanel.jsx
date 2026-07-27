import React, { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, Package, PackageSearch } from "lucide-react";
import { useCombos } from "./CombosContext";
import { useProducts } from "./ProductsContext";
import ComboModal, { ComboIcon } from "./ComboModal";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function CombosPanel() {
  const { combos, addCombo, updateCombo, removeCombo } = useCombos();
  const { products } = useProducts();

  const [search, setSearch] = useState("");
  // null | { mode: "view" | "edit" | "create", combo?: combo }
  const [modal, setModal] = useState(null);

  const productName = (id) =>
    products.find((p) => p.id === id)?.name || "Produto removido";

  const itemsLabel = (combo) =>
    combo.items.map((i) => `${i.qty}x ${productName(i.productId)}`).join(", ");

  const filtered = useMemo(() => {
    return combos.filter((c) => {
      if (
        search.trim() &&
        !c.name.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [combos, search]);

  const handleSave = (data) => {
    if (modal?.mode === "edit" && modal.combo) {
      updateCombo(modal.combo.id, data);
    } else if (modal?.mode === "create") {
      addCombo(data);
    }
    setModal(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    removeCombo(id);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + Novo Combo */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Combos & Kits</h1>
          <p className="mt-1 text-slate-500">
            {combos.length} combo{combos.length !== 1 ? "s" : ""} cadastrado
            {combos.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          <Plus size={18} strokeWidth={2.5} />
          Novo Combo
        </button>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar combo..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabela ou estado vazio */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <PackageSearch
            size={40}
            className="mb-3 text-slate-300"
            strokeWidth={1.5}
          />
          <p className="text-slate-400">
            {combos.length === 0
              ? "Nenhum combo cadastrado"
              : "Nenhum combo encontrado"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1.6fr_1.6fr_1fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 px-6 py-3 text-sm text-slate-400">
            <span>Combo</span>
            <span>Itens</span>
            <span>Preço</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>

          {filtered.map((combo, idx) => (
            <div
              key={combo.id}
              onClick={() => setModal({ mode: "view", combo })}
              className={`grid cursor-pointer grid-cols-[1.6fr_1.6fr_1fr_0.8fr_0.8fr] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50 ${
                idx !== filtered.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <ComboIcon />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {combo.name}
                  </div>
                  {combo.description && (
                    <div className="text-xs text-slate-400">
                      {combo.description}
                    </div>
                  )}
                </div>
              </div>

              <span className="flex items-center gap-1 truncate text-sm text-slate-500">
                <Package size={14} className="shrink-0 text-slate-400" />
                <span className="truncate">{itemsLabel(combo)}</span>
              </span>

              <span className="text-sm font-bold text-blue-600">
                {formatBRL(combo.price)}
              </span>

              <span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    combo.status === "Ativo"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {combo.status}
                </span>
              </span>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModal({ mode: "edit", combo });
                  }}
                  className="text-slate-400 transition-colors hover:text-blue-600"
                  aria-label="Editar combo"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, combo.id)}
                  className="text-slate-400 transition-colors hover:text-red-600"
                  aria-label="Remover combo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais */}
      {modal && (
        <ComboModal
          mode={modal.mode}
          combo={modal.combo}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onRequestEdit={() => setModal({ mode: "edit", combo: modal.combo })}
        />
      )}
    </main>
  );
}
