import React, { useEffect, useMemo, useState } from "react";
import { X, Package, Plus, Trash2, MapPin, CreditCard, Calendar, Clock } from "lucide-react";
import { useProducts } from "./ProductsContext";
import { useSettings } from "./SettingsContext";
import {
  ReferenceImageField,
  ReferenceLightbox,
} from "./ReferencePhotos";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const paymentStatuses = [
  { id: "pendente", label: "Pendente" },
  { id: "parcial", label: "Parcial" },
  { id: "pago", label: "Pago" },
];

export default function EditOrderModal({ order, onClose, onSave }) {
  const { products } = useProducts();
  const { getSlotsForDate } = useSettings();

  const [items, setItems] = useState(() => order.items.map((i) => ({ ...i })));
  const [address, setAddress] = useState(order.address || "");
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [discountPercent, setDiscountPercent] = useState(order.discountPercent || 0);
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || "");
  const [deliveryTime, setDeliveryTime] = useState(order.deliveryTime || "");

  const [pickerProductId, setPickerProductId] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountValue = (subtotal * (Number(discountPercent) || 0)) / 100;
  const total = Math.max(subtotal - discountValue, 0);

  // Horários agendáveis (a cada 15 min) para a data escolhida, conforme o
  // horário de funcionamento configurado. Se o dia estiver fechado, a
  // lista vem vazia.
  const daySlots = useMemo(
    () => getSlotsForDate(deliveryDate),
    [getSlotsForDate, deliveryDate]
  );

  // Se a data mudar e o horário selecionado não existir mais nos slots do
  // novo dia, limpa a seleção para forçar escolher um horário válido.
  useEffect(() => {
    if (deliveryTime && !daySlots.includes(deliveryTime)) {
      setDeliveryTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySlots]);

  const handleAddItem = () => {
    if (!pickerProductId) return;
    const product = products.find((p) => p.id === Number(pickerProductId));
    if (!product) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
    setPickerProductId("");
  };

  const handleQtyChange = (id, qty) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Foto de referência do item (ex: cliente mandou "quero o bolo assim").
  const handleItemImageChange = (id) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, referenceImage: reader.result } : i
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeItemImage = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, referenceImage: null } : i))
    );
  };

  const handleSubmit = () => {
    if (
      items.length === 0 ||
      !address.trim() ||
      !deliveryDate ||
      !deliveryTime
    )
      return;
    onSave({
      items,
      address: address.trim(),
      paymentStatus,
      subtotal,
      discountPercent: Number(discountPercent) || 0,
      discountValue,
      total,
      deliveryDate,
      deliveryTime,
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
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Editar Pedido</h2>
            <p className="text-sm text-slate-400">{order.client?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Itens */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Itens do Pedido
            </label>

            <div className="mb-3 flex items-center gap-2">
              <select
                value={pickerProductId}
                onChange={(e) => setPickerProductId(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Adicionar produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddItem}
                disabled={!pickerProductId}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Adicionar item"
              >
                <Plus size={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">
                Nenhum item no pedido
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                  >
                    <Package size={15} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatBRL(item.price)}
                      </div>
                    </div>
                    <ReferenceImageField
                      item={item}
                      size={28}
                      onOpen={setLightboxImage}
                      onChange={handleItemImageChange(item.id)}
                      onRemove={() => removeItemImage(item.id)}
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        handleQtyChange(item.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm"
                    />
                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-slate-800">
                      {formatBRL(item.price * item.qty)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="shrink-0 text-slate-300 hover:text-red-500"
                      aria-label={`Remover ${item.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data e Horário */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar size={15} /> Data
                </label>
                <input
                  type="date"
                  lang="pt-BR"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock size={15} /> Horário
                </label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  disabled={daySlots.length === 0}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecionar</option>
                  {daySlots.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {daySlots.length === 0 && (
              <p className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
                Estabelecimento fechado nesta data. Escolha outra data ou
                ajuste o horário de funcionamento na página inicial.
              </p>
            )}
          </div>

          {/* Endereço */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <MapPin size={15} /> Endereço
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Endereço de entrega"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status de pagamento */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <CreditCard size={15} /> Status do Pagamento
            </label>
            <div className="grid grid-cols-3 gap-3">
              {paymentStatuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPaymentStatus(s.id)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    paymentStatus === s.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desconto */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Desconto (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                %
              </span>
            </div>
            {Number(discountPercent) > 0 && (
              <p className="mt-1.5 text-xs text-slate-400">
                Equivale a{" "}
                <span className="font-semibold text-slate-600">
                  {formatBRL(discountValue)}
                </span>{" "}
                de desconto
              </p>
            )}
          </div>

          {/* Totais */}
          <div className="space-y-1 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Desconto ({discountPercent}%)</span>
                <span>-{formatBRL(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="text-blue-600">{formatBRL(total)}</span>
            </div>
          </div>
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
            disabled={
              items.length === 0 ||
              !address.trim() ||
              !deliveryDate ||
              !deliveryTime
            }
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>

      <ReferenceLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
