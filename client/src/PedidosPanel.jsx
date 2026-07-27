import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  History,
  Pencil,
  MapPin,
  Store,
  Truck,
  Ban,
  ChefHat,
  PackageCheck,
  PackageSearch,
} from "lucide-react";
import { useOrders } from "./OrdersContext";
import EditOrderModal from "./EditOrderModal";
import {
  ReferencePhotosBadge,
  getOrderReferenceImages,
  ReferenceLightbox,
} from "./ReferencePhotos";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const todayISO = () => new Date().toISOString().split("T")[0];

const toBRDate = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/** "sexta-feira, 25 de julho de 2026" -> "Sexta-Feira, 25 De Julho De 2026" */
function formatLongDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const raw = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return raw
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function shiftISO(iso, deltaDays) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split("T")[0];
}

/* ---------------------------------------------------------
   Status do pedido — mesmo critério usado no Dashboard, com o
   acréscimo de "cancelado" (que não aparece em Produção/Expedição,
   mas precisa ser visível aqui, já que esta tela lista TODOS os
   pedidos do sistema).
--------------------------------------------------------- */
const statusMeta = {
  recebido: { label: "Recebido", bg: "#fef3c7", text: "#b45309", icon: Clock },
  em_producao: { label: "Em Produção", bg: "#ffedd5", text: "#c2410c", icon: ChefHat },
  pronto: { label: "Pronto", bg: "#dcfce7", text: "#16a34a", icon: PackageCheck },
  em_rota: { label: "Em Rota", bg: "#e0e7ff", text: "#4338ca", icon: Truck },
  cancelado: { label: "Cancelado", bg: "#fee2e2", text: "#dc2626", icon: Ban },
};

function getOrderStatusMeta(order) {
  if (order.status === "entregue") {
    return order.deliveryType === "retirada"
      ? { label: "Retirado", bg: "#ede9fe", text: "#7c3aed", icon: Store }
      : { label: "Entregue", bg: "#dcfce7", text: "#16a34a", icon: Truck };
  }
  return statusMeta[order.status] || statusMeta.recebido;
}

const paymentStatusMeta = {
  pendente: { label: "Pendente", bg: "#fee2e2", text: "#dc2626" },
  parcial: { label: "Parcial", bg: "#fef3c7", text: "#b45309" },
  pago: { label: "Pago", bg: "#dcfce7", text: "#16a34a" },
};

/* ---------------------------------------------------------
   Main component
--------------------------------------------------------- */
export default function PedidosPanel({ onNovoPedido = () => {} }) {
  const { orders, updateOrder } = useOrders();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const today = todayISO();
  const isToday = selectedDate === today;

  /* ---------------- Pedidos da data selecionada ---------------- */
  const dayOrders = useMemo(
    () => orders.filter((o) => o.deliveryDate === selectedDate),
    [orders, selectedDate]
  );

  const matchesSearch = (order, q) =>
    !q ||
    order.client?.name?.toLowerCase().includes(q) ||
    (order.client?.phone || "").includes(q) ||
    (order.items || []).some((i) => i.name.toLowerCase().includes(q));

  const filteredDayOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...dayOrders]
      .filter((o) => matchesSearch(o, q))
      .sort((a, b) => (a.deliveryTime || "").localeCompare(b.deliveryTime || ""));
  }, [dayOrders, search]);

  const dayStats = useMemo(() => {
    const total = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const ativos = dayOrders.filter(
      (o) => o.status !== "entregue" && o.status !== "cancelado"
    ).length;
    return { count: dayOrders.length, total, ativos };
  }, [dayOrders]);

  /* ---------------- Histórico: pedidos já concluídos (entregues,
     retirados ou cancelados), de qualquer data, mais recentes primeiro ---------------- */
  const historyOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = orders.filter(
      (o) => o.status === "entregue" || o.status === "cancelado"
    );
    return base
      .filter((o) => matchesSearch(o, q))
      .sort((a, b) => {
        const da = `${a.deliveryDate || ""} ${a.deliveryTime || ""}`;
        const db = `${b.deliveryDate || ""} ${b.deliveryTime || ""}`;
        return db.localeCompare(da);
      });
  }, [orders, search]);

  const listToRender = showHistory ? historyOrders : filteredDayOrders;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + ações */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos</h1>
          <p className="mt-1 text-slate-500">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} no total
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              showHistory
                ? "bg-slate-800 text-white hover:bg-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <History size={16} />
            {showHistory ? "Voltar" : "Histórico"}
          </button>
          <button
            onClick={onNovoPedido}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            <Plus size={18} strokeWidth={2.5} />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Navegação de data — só faz sentido fora do modo Histórico */}
      {!showHistory && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setSelectedDate((d) => shiftISO(d, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50"
              aria-label="Dia anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 whitespace-nowrap px-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={15} className="shrink-0 text-slate-400" />
              {formatLongDate(selectedDate)}
            </div>
            <button
              onClick={() => setSelectedDate((d) => shiftISO(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50"
              aria-label="Próximo dia"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Hoje
            </button>
          )}

          <input
            type="date"
            lang="pt-BR"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
            <span>
              {dayStats.count} pedido{dayStats.count !== 1 ? "s" : ""}
            </span>
            <span>
              {dayStats.ativos} ativo{dayStats.ativos !== 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-slate-900">
              {formatBRL(dayStats.total)}
            </span>
          </div>
        </div>
      )}

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
            placeholder={
              showHistory
                ? "Buscar no histórico por cliente, telefone ou item..."
                : "Buscar por cliente, telefone ou item..."
            }
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {showHistory && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <History size={15} />
          {historyOrders.length} pedido{historyOrders.length !== 1 ? "s" : ""}{" "}
          concluído{historyOrders.length !== 1 ? "s" : ""} ou cancelado
          {historyOrders.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Lista ou estado vazio */}
      {listToRender.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <PackageSearch
            size={40}
            className="mb-3 text-slate-300"
            strokeWidth={1.5}
          />
          <p className="text-slate-400">
            {showHistory
              ? "Nenhum pedido no histórico"
              : dayOrders.length === 0
              ? "Nenhum pedido para esta data"
              : "Nenhum pedido encontrado"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {listToRender.map((order, idx) => (
            <PedidoRow
              key={order.id}
              order={order}
              isLast={idx === listToRender.length - 1}
              showDate={showHistory}
              onEdit={() => setEditingOrder(order)}
              onViewImage={setLightboxImage}
            />
          ))}
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={(data) => {
            updateOrder(editingOrder.id, data);
            setEditingOrder(null);
          }}
        />
      )}

      <ReferenceLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </main>
  );
}

/* ---------------------------------------------------------
   Linha de pedido — usada tanto na lista do dia quanto no histórico
--------------------------------------------------------- */
function PedidoRow({ order, isLast, showDate, onEdit, onViewImage }) {
  const meta = getOrderStatusMeta(order);
  const payMeta =
    paymentStatusMeta[order.paymentStatus] || paymentStatusMeta.pendente;
  const itemsLabel = (order.items || [])
    .map((i) => `${i.qty}x ${i.name}`)
    .join(", ");
  const referenceImages = getOrderReferenceImages(order);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex w-16 shrink-0 flex-col items-start">
          {showDate ? (
            <>
              <span className="text-xs font-semibold text-slate-500">
                {toBRDate(order.deliveryDate)}
              </span>
              <span className="text-xs text-slate-400">
                {order.deliveryTime}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-700">
              <Clock size={13} className="text-slate-400" />
              {order.deliveryTime}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-900">
            {order.client?.name}
            {order.deliveryType === "retirada" ? (
              <span className="flex items-center gap-1 text-xs font-normal text-slate-400">
                <Store size={12} /> Retirada
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1 text-xs font-normal text-slate-400">
                <MapPin size={12} className="shrink-0" />
                <span className="max-w-[220px] truncate">{order.address}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="max-w-[420px] truncate">{itemsLabel}</span>
            <ReferencePhotosBadge images={referenceImages} onOpen={onViewImage} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: payMeta.bg, color: payMeta.text }}
        >
          {payMeta.label}
        </span>
        <span
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          {meta.icon && <meta.icon size={12} />}
          {meta.label}
        </span>
        <span className="w-24 text-right text-sm font-bold text-slate-900">
          {formatBRL(order.total)}
        </span>
        <button
          onClick={onEdit}
          className="text-slate-400 transition-colors hover:text-blue-600"
          aria-label="Editar pedido"
        >
          <Pencil size={16} />
        </button>
      </div>
    </div>
  );
}
