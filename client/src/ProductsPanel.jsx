import React, { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, PackageSearch } from "lucide-react";
import { useProducts } from "./ProductsContext";
import { useStock } from "./StockContext";
import { categories } from "./productCategories";
import ProductModal, { ProductIcon } from "./ProductModal";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const filterTabs = [{ key: "Todas", label: "Todas" }, ...categories.map((c) => ({
  key: c.key,
  label: c.label,
}))];

const GRID_COLS = "grid-cols-[2fr_1fr_1.2fr_0.8fr_0.6fr_0.8fr]";

const stockDotMeta = {
  ok: { color: "#22c55e", label: "OK" },
  baixo: { color: "#f59e0b", label: "Baixo" },
  esgotado: { color: "#ef4444", label: "Esgotado" },
};

function getStockStatus(quantity, threshold) {
  if (quantity <= 0) return "esgotado";
  if (quantity <= threshold) return "baixo";
  return "ok";
}

export default function ProductsPanel() {
  const { products, addProduct, updateProduct, removeProduct } = useProducts();
  const { getStock } = useStock();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  // null | { mode: "view" | "edit" | "create", product?: product }
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "Todas" && p.category !== categoryFilter)
        return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [products, categoryFilter, search]);

  const handleSave = (data) => {
    if (modal?.mode === "edit" && modal.product) {
      updateProduct(modal.product.id, data);
    } else if (modal?.mode === "create") {
      addProduct(data);
    }
    setModal(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    removeProduct(id);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + Novo Produto */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Produtos</h1>
          <p className="mt-1 text-slate-500">Gerencie o catálogo de produtos</p>
        </div>

        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          <Plus size={18} strokeWidth={2.5} />
          Novo Produto
        </button>
      </div>

      {/* Busca + filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              onClick={() => setCategoryFilter(f.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                categoryFilter === f.key
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
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
            {products.length === 0
              ? "Nenhum produto cadastrado"
              : "Nenhum produto encontrado"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Cabeçalho */}
          <div className={`grid ${GRID_COLS} gap-4 border-b border-slate-100 px-6 py-3 text-sm text-slate-400`}>
            <span>Produto</span>
            <span>Categoria</span>
            <span>Preço</span>
            <span>Status</span>
            <span>Estoque</span>
            <span className="text-right">Ações</span>
          </div>

          {filtered.map((product, idx) => {
            const { quantity, criticalThreshold } = getStock(product.id);
            const stockStatus = getStockStatus(quantity, criticalThreshold);
            const stockMeta = stockDotMeta[stockStatus];

            return (
            <div
              key={product.id}
              onClick={() => setModal({ mode: "view", product })}
              className={`grid cursor-pointer ${GRID_COLS} items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50 ${
                idx !== filtered.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <ProductIcon category={product.category} image={product.image} />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {product.name}
                  </div>
                  {product.description && (
                    <div className="text-xs text-slate-400">
                      {product.description}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-sm text-slate-600">{product.category}</span>

              <span className="text-sm">
                <span className="font-bold text-slate-900">
                  {formatBRL(product.price)}
                </span>{" "}
                <span className="text-slate-400">
                  /{" "}
                  {product.unitsPerPackage > 1
                    ? `pacote (${product.unitsPerPackage} un.)`
                    : product.unit.toLowerCase()}
                </span>
              </span>

              <span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    product.status === "Ativo"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {product.status}
                </span>
              </span>

              <span
                className="flex items-center gap-2"
                title={`Estoque: ${quantity} — ${stockMeta.label}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stockMeta.color }}
                />
                <span className="text-xs text-slate-400">{quantity}</span>
              </span>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModal({ mode: "edit", product });
                  }}
                  className="text-slate-400 transition-colors hover:text-blue-600"
                  aria-label="Editar produto"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, product.id)}
                  className="text-slate-400 transition-colors hover:text-red-600"
                  aria-label="Remover produto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {modal && (
        <ProductModal
          mode={modal.mode}
          product={modal.product}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onRequestEdit={() =>
            setModal({ mode: "edit", product: modal.product })
          }
        />
      )}
    </main>
  );
}
