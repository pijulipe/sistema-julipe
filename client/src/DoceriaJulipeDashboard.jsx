import React, { useState } from "react";
import {
  ShoppingBag,
  Factory,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Plus,
  PackageSearch,
  Clock,
  Truck,
  Store,
  AlarmClock,
  ChevronDown,
} from "lucide-react";
import { usePedidos } from "./PedidosContext";



import ConfiguracaoPedidosPanel from "./ConfiguracaoPedidosPanel.jsx";
import ResumoFinanceiroPedidos from "./ResumoFinanceiroPedidos.jsx";
import AlertasCapacidadePedidos from "./AlertasCapacidadePedidos.jsx";
import BarraIndicadores from "./BarraIndicadores.jsx";


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
    { label: "Pedidos Hoje", value: String(topedidosDoDia.length), icon: ShoppingBag, color: "#2563eb" },
    { label: "Em Produção", value: String(emProducaoCount), icon: Factory, color: "#ea580c" },
    { label: "Prontos", value: String(prontosCount), icon: CheckCircle2, color: "#16a34a" },
    { label: "Faturamento", value: formatBRL(faturamento), icon: DollarSign, color: "#9333ea" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Title row */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Doceria Julipe
          </h1>
          <p className="mt-1 text-sm text-slate-500">{formatToday()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {acesso?.perfilAcesso === "GERENTE" && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              aria-haspopup="dialog"
              className="inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 px-4 py-3 text-sm border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <AlarmClock size={14} aria-hidden="true" />
              </span>
              Horários & Alertas
            </button>
          )}
          <button
            onClick={onNovoPedido}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            <Plus size={18} strokeWidth={2.5} />
            Novo Pedido
          </button>
        </div>
      </div>

      {showSettings && acesso?.perfilAcesso === "GERENTE" && <ConfiguracaoPedidosPanel onClose={() => setShowSettings(false)} />}
      {erro && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{erro}</p>}
      {carregando && <p className="mb-4 text-sm text-slate-500">Carregando pedidos…</p>}
      <AlertasCapacidadePedidos />

      {/* Indicadores do dia */}
      <BarraIndicadores itens={stats} />

      {/* Financeiro de hoje (recolhível, aberto por padrão) */}
      <details open className="group mb-8">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="-rotate-90 transition-transform group-open:rotate-0"
          />
          Financeiro de Hoje
        </summary>
        <div className="mt-3">
          <ResumoFinanceiroPedidos dataInicio={today} dataFim={today} className="mb-0" />
        </div>
      </details>

      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle size={20} className="text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">
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
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {sortedToday.map((pedido, idx) => {
            const meta = obterStatusPedido(pedido);
            const itemsLabel = pedido.itens
              .map((i) => `${i.quantidade}x ${i.nome}`)
              .join(", ");
            const imagemReferencias = obterImagensReferenciaPedido(pedido);
            return (
              <div
                key={pedido.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 ${
                  idx !== sortedToday.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
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
                <div className="flex flex-wrap items-center gap-3">
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
