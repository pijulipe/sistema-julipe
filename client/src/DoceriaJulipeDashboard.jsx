import React, { useMemo, useState } from "react";
import {
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Plus,
  PackageSearch,
  PackageMinus,
  Clock,
  Truck,
  Store,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useOrders } from "./OrdersContext";
import { useProducts } from "./ProductsContext";
import { useCombos } from "./CombosContext";
import { useStock } from "./StockContext";
import { useSettings, DAYS_OF_WEEK } from "./SettingsContext";
import { categories } from "./productCategories";
import {
  getHourBucket,
  decomposeOrderItems,
  sumByCategory,
  getExceededCategories,
  decomposeItemsByProduct,
  sumByProduct,
} from "./capacity";
import {
  ReferencePhotosBadge,
  getOrderReferenceImages,
  ReferenceLightbox,
} from "./ReferencePhotos";

const statusMeta = {
  recebido: { label: "Recebido", bg: "#fef3c7", text: "#b45309" },
  em_producao: { label: "Em Produção", bg: "#ffedd5", text: "#c2410c" },
  pronto: { label: "Pronto", bg: "#dcfce7", text: "#16a34a" },
  em_rota: { label: "Em Rota", bg: "#e0e7ff", text: "#4338ca", icon: Truck },
};

/**
 * Status "entregue" precisa diferenciar visualmente pedidos de entrega
 * (chegaram até o cliente de fato, por isso o ícone de caminhão) dos
 * pedidos de retirada (o cliente buscou no local, por isso o ícone de loja).
 */
function getOrderStatusMeta(order) {
  if (order.status === "entregue") {
    return order.deliveryType === "retirada"
      ? { label: "Retirado", bg: "#ede9fe", text: "#7c3aed", icon: Store }
      : { label: "Entregue", bg: "#dcfce7", text: "#16a34a", icon: Truck };
  }
  return statusMeta[order.status] || statusMeta.recebido;
}

const todayISO = () => new Date().toISOString().split("T")[0];

const formatBRL = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatToday() {
  const raw = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  // "sexta-feira, 24 de julho" -> "Sexta-Feira, 24 De Julho"
  return raw
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function DoceriaJulipeDashboard({ onNovoPedido = () => {} }) {
  const { orders, markDelivered } = useOrders();
  const { products } = useProducts();
  const { combos } = useCombos();
  const { getStock } = useStock();
  const { businessHours, setDayHours, alertThresholds, setThreshold, autoDeductStock, toggleAutoDeductStock } =
    useSettings();

  const [showSettings, setShowSettings] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const today = todayISO();
  const todayOrders = orders.filter((o) => o.deliveryDate === today);
  const emProducaoCount = todayOrders.filter(
    (o) => o.status === "em_producao"
  ).length;
  const prontosCount = todayOrders.filter((o) => o.status === "pronto").length;
  const faturamento = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const pendentesCount = todayOrders.filter(
    (o) => o.status !== "entregue"
  ).length;

  const sortedToday = [...todayOrders].sort((a, b) =>
    (a.deliveryTime || "").localeCompare(b.deliveryTime || "")
  );

  /* -----------------------------------------------------------
     Alerta de estoque insuficiente: compara o que já foi vendido
     (em todos os pedidos, inclusive dentro de combos) com o estoque
     disponível de cada produto.
     - Com baixa automática ativada, o estoque já é descontado pedido
       a pedido, então basta olhar se ficou negativo.
     - Sem baixa automática, o estoque não muda sozinho, então soma-se
       tudo que já foi vendido e compara com o que existe.
  ----------------------------------------------------------- */
  const insufficientStockAlerts = useMemo(() => {
    const soldByProduct = sumByProduct(
      decomposeItemsByProduct(orders.flatMap((o) => o.items), combos)
    );
    const alerts = [];
    products.forEach((p) => {
      const { quantity } = getStock(p.id);
      const missing = autoDeductStock
        ? Math.max(-quantity, 0)
        : Math.max((soldByProduct[p.id] || 0) - quantity, 0);
      if (missing > 0) {
        alerts.push({ productId: p.id, name: p.name, missing });
      }
    });
    return alerts;
  }, [orders, combos, products, getStock, autoDeductStock]);

  /* -----------------------------------------------------------
     Alertas de capacidade: agrupa os pedidos de hoje por hora
     (ex: tudo entre 08:00 e 08:59 cai no bucket "08"), decompõe
     os itens (inclusive combos) em unidades reais por categoria
     e compara com o limite configurado para cada categoria.
  ----------------------------------------------------------- */
  const capacityAlerts = useMemo(() => {
    const buckets = {};
    // Pedidos já concluídos (entregues/retirados) não ocupam mais
    // capacidade de produção, então saem da conta assim que mudam de
    // status — é isso que faz o alerta da hora sumir.
    todayOrders
      .filter((o) => o.status !== "entregue")
      .forEach((o) => {
        const hb = getHourBucket(o.deliveryTime);
        if (!hb) return;
        if (!buckets[hb]) buckets[hb] = [];
        buckets[hb].push(o);
      });

    const alerts = [];
    Object.entries(buckets).forEach(([hourBucket, ordersInHour]) => {
      const items = ordersInHour.flatMap((o) => o.items);
      const totals = sumByCategory(decomposeOrderItems(items, products, combos));
      const exceeded = getExceededCategories(totals, alertThresholds);
      exceeded.forEach((e) => alerts.push({ hourBucket, ...e }));
    });

    return alerts.sort((a, b) => a.hourBucket.localeCompare(b.hourBucket));
  }, [todayOrders, products, combos, alertThresholds]);

  const stats = [
    {
      label: "Pedidos Hoje",
      value: String(todayOrders.length),
      icon: ShoppingBag,
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      label: "Em Produção",
      value: String(emProducaoCount),
      icon: TrendingUp,
      color: "#ea580c",
      bg: "#fff7ed",
    },
    {
      label: "Prontos",
      value: String(prontosCount),
      icon: CheckCircle2,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      label: "Faturamento",
      value: formatBRL(faturamento),
      icon: DollarSign,
      color: "#9333ea",
      bg: "#faf5ff",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Title row */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Doceria Julipe
          </h1>
          <p className="mt-1 text-slate-500">{formatToday()}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAutoDeductStock}
            title="Quando ativado, a quantidade dos produtos (inclusive dentro de combos) é descontada automaticamente do estoque assim que um pedido é criado"
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              autoDeductStock
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <PackageMinus size={16} />
            Baixa Automática de Estoque
            <span
              className={`ml-1 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                autoDeductStock ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  autoDeductStock ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings size={16} />
            Horários & Alertas
            {showSettings ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
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

      {/* Configurações de horário de funcionamento + limites de alerta */}
      {showSettings && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Horário de funcionamento */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-bold text-slate-900">
              Horário de Funcionamento
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Define os horários agendáveis (a cada 15 min) na hora de criar um
              pedido, para cada dia da semana.
            </p>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const cfg = businessHours[day.key];
                return (
                  <div
                    key={day.key}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDayHours(day.key, "enabled", !cfg.enabled)
                      }
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        cfg.enabled
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {day.label}
                    </button>

                    {cfg.enabled ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="time"
                          value={cfg.start}
                          onChange={(e) =>
                            setDayHours(day.key, "start", e.target.value)
                          }
                          step={900}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-400">até</span>
                        <input
                          type="time"
                          value={cfg.end}
                          onChange={(e) =>
                            setDayHours(day.key, "end", e.target.value)
                          }
                          step={900}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Limites de alerta por categoria */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-bold text-slate-900">
              Limite de Alerta por Hora
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Define, por categoria, a partir de quantos itens (unidades
              reais) numa mesma hora deve aparecer o alerta de capacidade.
              Ex: +500 itens de Salgados. Deixe vazio para não alertar.
            </p>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <cat.icon size={15} style={{ color: cat.color }} />
                    {cat.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">+</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sem limite"
                      value={alertThresholds[cat.key] ?? ""}
                      onChange={(e) => setThreshold(cat.key, e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-400">itens/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerta de estoque insuficiente para atender os pedidos */}
      {insufficientStockAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {insufficientStockAlerts.map((a) => (
            <div
              key={a.productId}
              className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4"
            >
              <AlertTriangle size={20} className="shrink-0 text-red-500" />
              <div className="text-sm text-red-700">
                "<strong>{a.name}</strong>" insuficiente(s) para atender os
                pedidos{" "}
                <span className="text-red-500">
                  (faltam {a.missing.toLocaleString("pt-BR")})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de capacidade ativos hoje */}
      {capacityAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {capacityAlerts.map((a, i) => (
            <div
              key={`${a.hourBucket}-${a.category}-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4"
            >
              <AlertTriangle size={20} className="shrink-0 text-red-500" />
              <div className="text-sm text-red-700">
                <strong>
                  {a.hourBucket}:00–{a.hourBucket}:59
                </strong>{" "}
                — {a.qty.toLocaleString("pt-BR")} itens de{" "}
                <strong>{a.category}</strong> agendados (limite: +
                {a.threshold})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-8 rounded-2xl border border-slate-100 bg-white px-8 py-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-14 gap-y-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: bg }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div className="text-xl font-bold leading-tight text-slate-900">
                  {value}
                </div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle size={18} className="text-amber-500" />
        <h2 className="text-base font-semibold text-slate-900">
          Pedidos de Hoje
        </h2>
        <span className="text-sm text-slate-400">
          ({pendentesCount} pendentes)
        </span>
      </div>

      {/* List or empty state */}
      {sortedToday.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <PackageSearch
            size={40}
            className="mb-3 text-slate-300"
            strokeWidth={1.5}
          />
          <p className="text-slate-400">Nenhum pedido para hoje</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {sortedToday.map((order, idx) => {
            const meta = getOrderStatusMeta(order);
            const itemsLabel = order.items
              .map((i) => `${i.qty}x ${i.name}`)
              .join(", ");
            const referenceImages = getOrderReferenceImages(order);
            return (
              <div
                key={order.id}
                className={`flex items-center justify-between px-6 py-4 ${
                  idx !== sortedToday.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <Clock size={14} /> {order.deliveryTime}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {order.client?.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {itemsLabel}
                      <ReferencePhotosBadge
                        images={referenceImages}
                        onOpen={setLightboxImage}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {order.deliveryType === "retirada" && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Store size={13} /> Retirada
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-900">
                    {formatBRL(order.total)}
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === "em_rota"
                        ? "cursor-pointer hover:opacity-80"
                        : ""
                    }`}
                    style={{ backgroundColor: meta.bg, color: meta.text }}
                    onClick={
                      order.status === "em_rota"
                        ? () => markDelivered(order.id)
                        : undefined
                    }
                    title={
                      order.status === "em_rota"
                        ? "Clique para marcar como entregue"
                        : undefined
                    }
                  >
                    {meta.icon && <meta.icon size={12} />}
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReferenceLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </main>
  );
}
