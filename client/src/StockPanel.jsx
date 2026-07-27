import React, { useMemo, useState } from "react";
import {
  Search,
  AlertTriangle,
  TrendingDown,
  PackageSearch,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { useProducts } from "./ProductsContext";
import { useStock } from "./StockContext";
import { categories } from "./productCategories";
import { ProductIcon } from "./ProductModal";

const filterTabs = [
  { key: "Todas", label: "Todas" },
  ...categories.map((c) => ({ key: c.key, label: c.label })),
];

const statusMeta = {
  ok: {
    label: "OK",
    badgeBg: "#dcfce7",
    badgeText: "#15803d",
    rowTint: "rgba(240,253,244,0.6)",
    borderColor: "#22c55e",
    numberColor: "#15803d",
  },
  baixo: {
    label: "Baixo",
    badgeBg: "#fef3c7",
    badgeText: "#b45309",
    rowTint: "rgba(255,251,235,0.6)",
    borderColor: "#f59e0b",
    numberColor: "#b45309",
  },
  esgotado: {
    label: "Esgotado",
    badgeBg: "#fee2e2",
    badgeText: "#dc2626",
    rowTint: "rgba(254,242,242,0.6)",
    borderColor: "#ef4444",
    numberColor: "#dc2626",
  },
};

function getStatus(quantity, threshold) {
  if (quantity <= 0) return "esgotado";
  if (quantity <= threshold) return "baixo";
  return "ok";
}

const GRID_COLS = "grid-cols-[2fr_1fr_1.3fr_1fr_1.6fr]";

export default function StockPanel() {
  const { products } = useProducts();
  const { getStock } = useStock();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "Todas" && p.category !== categoryFilter)
        return false;
      if (
        search.trim() &&
        !p.name.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [products, categoryFilter, search]);

  const { esgotadosCount, baixoCount, baixoRealUnits, hasMultiplier } =
    useMemo(() => {
      let esgotados = 0;
      let baixo = 0;
      let baixoReal = 0;
      let multiplier = false;
      products.forEach((p) => {
        const { quantity, criticalThreshold } = getStock(p.id);
        const status = getStatus(quantity, criticalThreshold);
        const unitsPerPackage = p.unitsPerPackage || 1;
        if (unitsPerPackage > 1) multiplier = true;
        if (status === "esgotado") esgotados++;
        else if (status === "baixo") {
          baixo++;
          baixoReal += quantity * unitsPerPackage;
        }
      });
      return {
        esgotadosCount: esgotados,
        baixoCount: baixo,
        baixoRealUnits: baixoReal,
        hasMultiplier: multiplier,
      };
    }, [products, getStock]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Estoque</h1>
        <p className="mt-1 text-slate-500">Controle de produtos acabados</p>
      </div>

      {/* Alertas — só aparecem se houver algum produto naquele estado */}
      {(esgotadosCount > 0 || baixoCount > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {esgotadosCount > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <AlertTriangle size={20} className="shrink-0 text-red-500" />
              <div>
                <div className="text-sm font-semibold text-red-700">
                  Produtos sem estoque
                </div>
                <div className="text-sm text-red-500">
                  {esgotadosCount} produto{esgotadosCount !== 1 ? "s" : ""}{" "}
                  esgotado{esgotadosCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          )}

          {baixoCount > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <TrendingDown size={20} className="shrink-0 text-amber-500" />
              <div>
                <div className="text-sm font-semibold text-amber-700">
                  Estoque baixo
                </div>
                <div className="text-sm text-amber-600">
                  {baixoCount} produto{baixoCount !== 1 ? "s" : ""} abaixo do
                  limite crítico
                  {hasMultiplier && (
                    <>
                      {" "}
                      ({baixoRealUnits.toLocaleString("pt-BR")} unidades
                      reais restantes)
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
          <div
            className={`grid ${GRID_COLS} gap-4 border-b border-slate-100 px-6 py-3 text-sm text-slate-400`}
          >
            <span>Produto</span>
            <span>Categoria</span>
            <span>Estoque</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>

          {filtered.map((product, idx) => (
            <StockRow
              key={product.id}
              product={product}
              isLast={idx === filtered.length - 1}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/* ---------------------------------------------------------
   Linha de estoque de um produto
--------------------------------------------------------- */
function StockRow({ product, isLast }) {
  const { getStock, adjustQuantity, setCriticalThreshold } = useStock();
  const { quantity, criticalThreshold } = getStock(product.id);
  const [removeAmount, setRemoveAmount] = useState("");

  const status = getStatus(quantity, criticalThreshold);
  const meta = statusMeta[status];
  const unitsPerPackage = product.unitsPerPackage || 1;

  const parsedAmount = Number(removeAmount);
  const hasValidAmount = removeAmount !== "" && !isNaN(parsedAmount) && parsedAmount !== 0;

  const handleConfirm = () => {
    if (!hasValidAmount) return;
    adjustQuantity(product.id, parsedAmount);
    setRemoveAmount("");
  };

  return (
    <div
      className={`grid ${GRID_COLS} items-center gap-4 px-6 py-4 transition-colors ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
      style={{
        borderLeft: `4px solid ${meta.borderColor}`,
        backgroundColor: meta.rowTint,
      }}
    >
      <div className="flex items-center gap-3">
        <ProductIcon category={product.category} image={product.image} />
        <span className="text-sm font-semibold text-slate-900">
          {product.name}
        </span>
      </div>

      <span className="text-sm text-slate-600">{product.category}</span>

      <div>
        <div
          className="text-2xl font-bold leading-tight"
          style={{ color: meta.numberColor }}
        >
          {quantity}
        </div>
        {unitsPerPackage > 1 && (
          <div className="text-xs text-slate-400">
            = {(quantity * unitsPerPackage).toLocaleString("pt-BR")} unidades
            reais
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          Alerta em
          <input
            type="number"
            min={0}
            value={criticalThreshold}
            onChange={(e) =>
              setCriticalThreshold(product.id, Number(e.target.value) || 0)
            }
            className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          un.
        </div>
      </div>

      <span>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
        >
          {meta.label}
        </span>
      </span>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => adjustQuantity(product.id, -1)}
          disabled={quantity <= 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Diminuir 1 unidade"
        >
          <ChevronDown size={15} />
        </button>
        <button
          onClick={() => adjustQuantity(product.id, 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          aria-label="Aumentar 1 unidade"
        >
          <ChevronUp size={15} />
        </button>
        <div className="flex flex-col items-center">
          <input
            type="number"
            value={removeAmount}
            onChange={(e) => setRemoveAmount(e.target.value)}
            placeholder="±0"
            title="Digite um número positivo para somar ou negativo para subtrair do estoque"
            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {unitsPerPackage > 1 && hasValidAmount && (
            <span className="mt-0.5 text-[10px] leading-none text-slate-400">
              {parsedAmount > 0 ? "+" : ""}
              {(parsedAmount * unitsPerPackage).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
        <button
          onClick={handleConfirm}
          disabled={!hasValidAmount}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Confirmar ajuste de estoque"
          title="Confirmar ajuste no estoque"
        >
          <Check size={15} />
        </button>
      </div>
    </div>
  );
}
