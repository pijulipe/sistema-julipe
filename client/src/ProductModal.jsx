import React, { useState } from "react";
import { X, Pencil, Check, Image as ImageIcon } from "lucide-react";
import {
  categories,
  units,
  getCategoryMeta,
  categorySupportsImage,
} from "./productCategories";
import { useProducts } from "./ProductsContext";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const emptyForm = {
  name: "",
  category: categories[0].key,
  unit: units[0],
  unitsPerPackage: String(categories[0].defaultUnitsPerPackage || 1),
  price: "",
  description: "",
  active: true,
  image: null,
};

/**
 * mode: "view" | "edit" | "create"
 * product: obrigatório para "view" e "edit"
 */
export default function ProductModal({ mode, product, onClose, onSave, onRequestEdit }) {
  const { findProductByName } = useProducts();
  const isForm = mode === "edit" || mode === "create";

  const [form, setForm] = useState(() =>
    mode === "edit" && product
      ? {
          name: product.name,
          category: product.category,
          unit: product.unit,
          unitsPerPackage: String(product.unitsPerPackage || 1),
          price: String(product.price),
          description: product.description || "",
          active: product.status !== "Inativo",
          image: product.image || null,
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

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setError("");
    setForm((prev) => ({
      ...prev,
      category: newCategory,
      unitsPerPackage:
        autoUnits && prev.unit === "Unidade"
          ? String(getCategoryMeta(newCategory).defaultUnitsPerPackage || 1)
          : prev.unitsPerPackage,
    }));
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    setError("");
    setForm((prev) => ({
      ...prev,
      unit: newUnit,
      // "Unidades por pacote" só faz sentido quando o produto é vendido
      // por Unidade (ex: salgados vendidos 1 a 1, mas produzidos em
      // pacotes de 25). Para Kg, Litro, Pacote ou Fatia, o multiplicador
      // não se aplica — volta pro padrão (1) e o campo fica escondido.
      unitsPerPackage: newUnit === "Unidade" ? prev.unitsPerPackage : "1",
    }));
  };

  const handleUnitsPerPackageChange = (e) => {
    setAutoUnits(false);
    setError("");
    setForm((prev) => ({ ...prev, unitsPerPackage: e.target.value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: null }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;

    const duplicate = findProductByName(
      form.name,
      mode === "edit" ? product?.id : undefined
    );
    if (duplicate) {
      setError(`Já existe um produto cadastrado com esse nome: ${duplicate.name}`);
      return;
    }

    onSave({
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      unitsPerPackage: Math.max(1, Number(form.unitsPerPackage) || 1),
      price: Number(form.price) || 0,
      description: form.description.trim(),
      status: form.active ? "Ativo" : "Inativo",
      image: categorySupportsImage(form.category) ? form.image || null : null,
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
        {mode === "view" && product && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <ProductIcon
                  category={product.category}
                  image={product.image}
                  size={40}
                />
                <span className="text-lg font-bold text-slate-900">
                  {product.name}
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

            {product.image && (
              <div className="px-6 pt-5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-40 w-full rounded-xl object-cover"
                />
              </div>
            )}

            <div className="space-y-4 px-6 py-5">
              <Row label="Categoria" value={product.category} />
              <Row
                label="Preço"
                value={
                  <span className="font-bold text-blue-600">
                    {formatBRL(product.price)}{" "}
                    <span className="text-sm font-normal text-slate-400">
                      /{" "}
                      {product.unitsPerPackage > 1
                        ? `pacote (${product.unitsPerPackage} un.)`
                        : product.unit.toLowerCase()}
                    </span>
                  </span>
                }
              />
              {product.unitsPerPackage > 1 && (
                <Row
                  label="Unidades por pacote"
                  value={`${product.unitsPerPackage} unidades`}
                />
              )}
              <Row
                label="Status"
                value={
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      product.status === "Ativo"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {product.status}
                  </span>
                }
              />

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-1 text-sm text-slate-500">Descrição</div>
                <p className="text-sm text-slate-700">
                  {product.description || "Sem descrição."}
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
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Nome do produto"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Categoria">
                  <select
                    value={form.category}
                    onChange={handleCategoryChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Unidade">
                  <select
                    value={form.unit}
                    onChange={handleUnitChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {form.unit === "Unidade" && (
                <Field label="Unidades por pacote">
                  <input
                    type="number"
                    min="1"
                    value={form.unitsPerPackage}
                    onChange={handleUnitsPerPackageChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Quantas unidades reais equivalem a 1 unidade de estoque. Ex:
                    salgados vendidos em pacotes de 25.
                  </p>
                </Field>
              )}

              {categorySupportsImage(form.category) && (
                <Field label="Foto do produto">
                  <div className="flex items-center gap-4">
                    {form.image ? (
                      <div className="relative shrink-0">
                        <img
                          src={form.image}
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
                      {form.image ? "Trocar foto" : "Adicionar foto"}
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
                  value={form.price}
                  onChange={handleChange("price")}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={handleChange("description")}
                  placeholder="Descrição do produto..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, active: !prev.active }))
                }
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  form.active
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Check size={15} />
                {form.active ? "Ativo para venda" : "Inativo"}
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
                disabled={!form.name.trim()}
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

export function ProductIcon({ category, image, size = 36 }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const meta = getCategoryMeta(category);
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
