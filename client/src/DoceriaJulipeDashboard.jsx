import React, { useState } from "react";
import {
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Plus,
  PackageSearch,
  Clock,
  Truck,
  Store,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePedidos } from "./PedidosContext";



import ConfiguracaoPedidosPanel from "./ConfiguracaoPedidosPanel.jsx";
import ResumoFinanceiroPedidos from "./ResumoFinanceiroPedidos.jsx";
import AlertasCapacidadePedidos from "./AlertasCapacidadePedidos.jsx";


import {
  FotosReferenciaBadge,
  obterImagensReferenciaPedido,
  LightboxReferencia,
} from "./FotosReferencia";

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
function obterStatusPedido(pedido) {
  if (pedido.status === "entregue") {
    return pedido.tipoEntrega === "retirada"
      ? { label: "Retirado", bg: "#ede9fe", text: "#7c3aed", icon: Store }
      : { label: "Entregue", bg: "#dcfce7", text: "#16a34a", icon: Truck };
  }
  return statusMeta[pedido.status] || statusMeta.recebido;
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
  const { pedidos, marcarEntregue, acesso, erro, carregando } = usePedidos();



  const [showSettings, setShowSettings] = useState(false);
  const [imagemLightbox, setLightboxImage] = useState(null);

  const today = todayISO();
  const topedidosDoDia = pedidos.filter((o) => o.dataEntrega === today);
  const emProducaoCount = topedidosDoDia.filter(
    (o) => o.status === "em_producao"
  ).length;
  const prontosCount = topedidosDoDia.filter((o) => o.status === "pronto").length;
  const faturamento = topedidosDoDia.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0);
  const pendentesCount = topedidosDoDia.filter(
    (o) => o.status !== "entregue" && o.status !== "cancelado"
  ).length;

  const sortedToday = [...topedidosDoDia].sort((a, b) =>
    (a.horarioEntrega || "").localeCompare(b.horarioEntrega || "")
  );

  const stats = [
    {
      label: "Pedidos Hoje",
      value: String(topedidosDoDia.length),
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
          {acesso?.perfilAcesso === "GERENTE" &&           <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings size={16} />
            Horários & Alertas
            {showSettings ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>}
          <button
            onClick={onNovoPedido}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            <Plus size={18} strokeWidth={2.5} />
            Novo Pedido
          </button>
        </div>
      </div>

      {showSettings && acesso?.perfilAcesso === "GERENTE" && <ConfiguracaoPedidosPanel />}
      {erro && <p role="alert" className="bg-red-50 p-3 text-red-700">{erro}</p>}
      {carregando && <p>Carregando pedidos…</p>}
      <details className="mb-4 text-sm text-slate-500"><summary className="cursor-pointer">Recebimentos, estornos e excedentes</summary><div className="mt-3"><ResumoFinanceiroPedidos dataInicio={today} dataFim={today} /></div></details>
      <AlertasCapacidadePedidos />

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
          {sortedToday.map((pedido, idx) => {
            const meta = obterStatusPedido(pedido);
            const itemsLabel = pedido.itens
              .map((i) => `${i.quantidade}x ${i.nome}`)
              .join(", ");
            const imagemReferencias = obterImagensReferenciaPedido(pedido);
            return (
              <div
                key={pedido.id}
                className={`flex items-center justify-between px-6 py-4 ${
                  idx !== sortedToday.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <Clock size={14} /> {pedido.horarioEntrega}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {pedido.cliente?.nome}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {itemsLabel}
                      <FotosReferenciaBadge
                        images={imagemReferencias}
                        onOpen={setLightboxImage}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pedido.tipoEntrega === "retirada" && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Store size={13} /> Retirada
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-900">
                    {formatBRL(pedido.total)}
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      pedido.status === "em_rota"
                        ? "cursor-pointer hover:opacity-80"
                        : ""
                    }`}
                    style={{ backgroundColor: meta.bg, color: meta.text }}
                    onClick={
                      pedido.status === "em_rota"
                        ? () => marcarEntregue(pedido.id)
                        : undefined
                    }
                    title={
                      pedido.status === "em_rota"
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

      <LightboxReferencia imagem={imagemLightbox} onClose={() => setLightboxImage(null)} />
    </main>
  );
}
