import React, { useMemo, useState } from "react";
import {
  Clock,
  ChefHat,
  PackageCheck,
  Search,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Store,
  Pencil,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { useOrders } from "./OrdersContext";
import { useStock } from "./StockContext";
import { useCombos } from "./CombosContext";
import { decomposeItemsByProduct, sumByProduct } from "./capacity";
import EditOrderModal from "./EditOrderModal";
import { ReferenceImageThumb, ReferenceLightbox } from "./ReferencePhotos";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatBRL = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayISO = () => new Date().toISOString().split("T")[0];

const toBRDate = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function isSameWeek(iso, refISO) {
  const d = new Date(`${iso}T00:00:00`);
  const r = new Date(`${refISO}T00:00:00`);
  const dayIndex = r.getDay() === 0 ? 6 : r.getDay() - 1; // semana começa na segunda
  const monday = new Date(r);
  monday.setDate(r.getDate() - dayIndex);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return d >= monday && d <= sunday;
}

function isSameMonth(iso, refISO) {
  const d = new Date(`${iso}T00:00:00`);
  const r = new Date(`${refISO}T00:00:00`);
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
}

const paymentStatusMeta = {
  pendente: { label: "Pendente", bg: "#fee2e2", text: "#dc2626" },
  parcial: { label: "Parcial", bg: "#fef3c7", text: "#b45309" },
  pago: { label: "Pago", bg: "#dcfce7", text: "#16a34a" },
};

const dateFilters = [
  { key: "hoje", label: "Hoje", icon: Clock },
  { key: "semana", label: "Semana", icon: null },
  { key: "mes", label: "Mês", icon: null },
  { key: "todos", label: "Todos", icon: null },
];

const columns = [
  {
    key: "recebido",
    label: "Recebido",
    icon: Clock,
    iconBg: "#fef3c7",
    iconColor: "#b45309",
  },
  {
    key: "em_producao",
    label: "Em Produção",
    icon: ChefHat,
    iconBg: "#ffedd5",
    iconColor: "#c2410c",
  },
  {
    key: "pronto",
    label: "Pronto",
    icon: PackageCheck,
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
  },
];

/* ---------------------------------------------------------
   Main component
--------------------------------------------------------- */
export default function ProductionPanel() {
  const { orders, advanceStatus, revertStatus, updateOrder, cancelOrder } =
    useOrders();
  const { combos } = useCombos();
  const { adjustQuantity } = useStock();
  const [dateFilter, setDateFilter] = useState("hoje");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [editingOrder, setEditingOrder] = useState(null);
  const [cancelingOrder, setCancelingOrder] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const today = todayISO();

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (dateFilter === "hoje" && o.deliveryDate !== today) return false;
      if (dateFilter === "semana" && !isSameWeek(o.deliveryDate, today))
        return false;
      if (dateFilter === "mes" && !isSameMonth(o.deliveryDate, today))
        return false;

      if (statusFilter !== "todos" && o.paymentStatus !== statusFilter)
        return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = o.client?.name?.toLowerCase().includes(q);
        const itemMatch = o.items.some((i) =>
          i.name.toLowerCase().includes(q)
        );
        if (!nameMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, dateFilter, statusFilter, search, today]);

  const grouped = {
    recebido: filtered.filter((o) => o.status === "recebido"),
    em_producao: filtered.filter((o) => o.status === "em_producao"),
    pronto: filtered.filter((o) => o.status === "pronto"),
  };

  /**
   * Confirma o cancelamento do pedido selecionado. Se o estoque já havia
   * sido descontado fisicamente na criação do pedido (stockDeducted),
   * devolve as quantidades correspondentes antes de marcar como cancelado.
   */
  const handleConfirmCancel = () => {
    if (!cancelingOrder) return;
    if (cancelingOrder.stockDeducted) {
      const totals = sumByProduct(
        decomposeItemsByProduct(cancelingOrder.items || [], combos)
      );
      Object.entries(totals).forEach(([productId, qty]) => {
        adjustQuantity(Number(productId), qty);
      });
    }
    cancelOrder(cancelingOrder.id);
    setCancelingOrder(null);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Painel de Produção
        </h1>
        <p className="mt-1 text-slate-500">
          {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} em
          produção
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {dateFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              dateFilter === f.key
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.icon && <f.icon size={15} />}
            {f.label}
          </button>
        ))}

        <div className="relative min-w-[240px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((col) => (
          <div key={col.key}>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: col.iconBg }}
              >
                <col.icon size={15} style={{ color: col.iconColor }} />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {col.label}
              </h2>
              <span className="ml-auto text-sm font-semibold text-slate-400">
                {grouped[col.key].length}
              </span>
            </div>

            <div className="space-y-4">
              {grouped[col.key].length === 0 ? (
                <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
                  Nenhum pedido
                </div>
              ) : (
                grouped[col.key].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={() => advanceStatus(order.id)}
                    onRevert={() => revertStatus(order.id)}
                    onEdit={() => setEditingOrder(order)}
                    onCancel={() => setCancelingOrder(order)}
                    onViewImage={setLightboxImage}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

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

      {cancelingOrder && (
        <CancelOrderModal
          order={cancelingOrder}
          onClose={() => setCancelingOrder(null)}
          onConfirm={handleConfirmCancel}
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
   Modal de confirmação de cancelamento
--------------------------------------------------------- */
function CancelOrderModal({ order, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Cancelar este pedido?
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            O pedido de <span className="font-semibold text-slate-700">{order.client?.name}</span> será
            marcado como cancelado e sairá do painel de produção. Essa ação
            não pode ser desfeita.
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancelar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Card de pedido
--------------------------------------------------------- */
function OrderCard({ order, onAdvance, onRevert, onEdit, onCancel, onViewImage }) {
  const payMeta =
    paymentStatusMeta[order.paymentStatus] || paymentStatusMeta.pendente;
  const isRetirada = order.deliveryType === "retirada";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Cliente + status de pagamento + editar */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900">
          {order.client?.name}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onEdit}
            className="text-slate-400 transition-colors hover:text-blue-600"
            aria-label="Editar pedido"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onCancel}
            className="text-slate-400 transition-colors hover:text-red-600"
            aria-label="Cancelar pedido"
            title="Cancelar pedido"
          >
            <Ban size={15} />
          </button>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: payMeta.bg, color: payMeta.text }}
          >
            {payMeta.label}
          </span>
        </div>
      </div>

      {/* Horário e data */}
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {order.deliveryTime}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          {toBRDate(order.deliveryDate)}
        </span>
      </div>

      {/* Itens do pedido */}
      <div className="mb-4 space-y-1.5">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-amber-50/80 px-3 py-2.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 font-medium text-amber-900">
              {item.referenceImage && (
                <ReferenceImageThumb
                  src={item.referenceImage}
                  alt={item.name}
                  size={24}
                  onOpen={onViewImage}
                />
              )}
              <span className="truncate">
                {item.qty}x {item.name}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-amber-900">
              {formatBRL(item.price * item.qty)}
            </span>
          </div>
        ))}
      </div>

      {/* Endereço (ou retirada) e total */}
      <div className="mb-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {isRetirada ? (
          <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500">
            <Store size={14} className="shrink-0 text-slate-400" />
            Retirada no local
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{order.address}</span>
          </span>
        )}
        <span className="shrink-0 text-base font-bold text-slate-900">
          {formatBRL(order.total)}
        </span>
      </div>

      {order.status !== "pronto" ? (
        <button
          onClick={onAdvance}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Avançar para {order.status === "recebido" ? "Em Produção" : "Pronto"}
          <ArrowRight size={15} />
        </button>
      ) : (
        <button
          onClick={onRevert}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={15} />
          Voltar para Em Produção
        </button>
      )}
    </div>
  );
}
