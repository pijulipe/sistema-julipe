import React, { useMemo, useState } from "react";
import {
  Search,
  Truck,
  Store,
  Clock,
  Phone,
  MapPin,
  Navigation,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { usePedidos } from "./PedidosContext";
import { MiniaturaImagemReferencia, LightboxReferencia } from "./FotosReferencia";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const todayISO = () => new Date().toISOString().split("T")[0];

function formatToday() {
  const raw = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return raw
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ---------------------------------------------------------
   Main component
--------------------------------------------------------- */
export default function ExpedicaoPanel() {
  const { pedidos, concluirPedido, marcarEntregue } = usePedidos();
  const [busca, setBusca] = useState("");
  const [imagemLightbox, setLightboxImage] = useState(null);

  const today = todayISO();

  const topedidosDoDia = useMemo(
    () => pedidos.filter((o) => o.dataEntrega === today),
    [pedidos, today]
  );

  // Pedidos que já saíram da produção (pronto) até serem finalizados
  // (entregue/retirado). Uma vez finalizados, saem automaticamente
  // desta tela e também não aparecem mais como "Pronto" na Produção.
  const pedidosAtivos = useMemo(
    () =>
      topedidosDoDia.filter(
        (o) => o.status === "pronto" || o.status === "em_rota"
      ),
    [topedidosDoDia]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pedidosAtivos;
    return pedidosAtivos.filter(
      (o) =>
        o.cliente?.nome?.toLowerCase().includes(q) ||
        (o.cliente?.telefone || "").includes(q) ||
        (o.bairro || o.cliente?.bairro || "")
          .toLowerCase()
          .includes(q)
    );
  }, [pedidosAtivos, busca]);

  const filtradosOrdenados = useMemo(
    () =>
      [...filtrados].sort((a, b) =>
        (a.horarioEntrega || "").localeCompare(b.horarioEntrega || "")
      ),
    [filtrados]
  );

  const stats = useMemo(() => {
    const prontos = topedidosDoDia.filter((o) => o.status === "pronto").length;
    const emRota = topedidosDoDia.filter((o) => o.status === "em_rota").length;
    const entregas = topedidosDoDia.filter(
      (o) =>
        o.tipoEntrega !== "retirada" &&
        (o.status === "pronto" || o.status === "em_rota")
    ).length;
    const retiradas = topedidosDoDia.filter(
      (o) => o.tipoEntrega === "retirada" && o.status === "pronto"
    ).length;
    return { prontos, emRota, entregas, retiradas };
  }, [topedidosDoDia]);

  // Roteiro de entregas: agrupa apenas pedidos de entrega (não retirada),
  // já que pedidos de retirada não têm endereço a ser roteirizado.
  const gruposRota = useMemo(() => {
    const pedidosEntrega = filtradosOrdenados.filter(
      (o) => o.tipoEntrega !== "retirada"
    );
    const groups = [];
    pedidosEntrega.forEach((pedido) => {
      const key =
        pedido.bairro?.trim() ||
        pedido.cliente?.bairro?.trim() ||
        "Sem bairro";
      let group = groups.find((g) => g.nome === key);
      if (!group) {
        group = { nome: key, pedidos: [] };
        groups.push(group);
      }
      group.pedidos.push(pedido);
    });
    return groups;
  }, [filtradosOrdenados]);

  const handleAcaoPrincipal = (pedido) => {
    if (pedido.status === "pronto") {
      concluirPedido(pedido.id);
    } else if (pedido.status === "em_rota") {
      marcarEntregue(pedido.id);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Expedição</h1>
        <p className="mt-1 text-slate-500">
          {formatToday()} • {pedidosAtivos.length} pedido
          {pedidosAtivos.length !== 1 ? "s" : ""} prontos
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Prontos" value={stats.prontos} />
        <StatCard label="Em Rota" value={stats.emRota} />
        <StatCard label="Entregas" value={stats.entregas} />
        <StatCard label="Retiradas" value={stats.retiradas} />
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, telefone ou bairro..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filtradosOrdenados.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Truck size={40} className="mb-3 text-slate-300" strokeWidth={1.5} />
          <p className="text-slate-400">
            {pedidosAtivos.length === 0
              ? "Nenhum pedido pronto para expedição hoje"
              : "Nenhum pedido encontrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Pedidos Prontos */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Pedidos Prontos
              </h2>
            </div>
            <div className="space-y-4">
              {filtradosOrdenados.map((pedido) => (
                <CardPedidoExpedicao
                  key={pedido.id}
                  pedido={pedido}
                  onAction={() => handleAcaoPrincipal(pedido)}
                  onViewImage={setLightboxImage}
                />
              ))}
            </div>
          </div>

          {/* Roteiro de Entregas */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Navigation size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Roteiro de Entregas
              </h2>
            </div>
            {gruposRota.length === 0 ? (
              <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
                Nenhuma entrega no roteiro
              </div>
            ) : (
              <div className="space-y-4">
                {gruposRota.map((group, idx) => (
                  <div
                    key={group.nome}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {group.nome}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({group.pedidos.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.pedidos.map((pedido) => (
                        <div
                          key={pedido.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-800">
                              {pedido.cliente?.nome}
                            </div>
                            <div className="truncate text-xs text-slate-400">
                              {pedido.endereco}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">
                            {pedido.horarioEntrega}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <LightboxReferencia
        imagem={imagemLightbox}
        onClose={() => setLightboxImage(null)}
      />
    </main>
  );
}

/* ---------------------------------------------------------
   Card de estatística
--------------------------------------------------------- */
function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 text-center shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   Card de pedido pronto para expedição
--------------------------------------------------------- */
function CardPedidoExpedicao({ pedido, onAction, onViewImage }) {
  const isRetirada = pedido.tipoEntrega === "retirada";
  const isEmRota = pedido.status === "em_rota";

  // O ícone de caminhão fica reservado para o que de fato roda de veículo
  // (saiu para entrega / entregue). Retirada, feita pelo próprio cliente
  // no balcão, usa o ícone de loja.
  const actionConfig = isEmRota
    ? {
        label: "Entregue",
        icon: CheckCircle2,
        className: "bg-emerald-600 hover:bg-emerald-700",
      }
    : isRetirada
    ? {
        label: "Retirado",
        icon: Store,
        className: "bg-violet-600 hover:bg-violet-700",
      }
    : {
        label: "Saiu para Entrega",
        icon: Truck,
        className: "bg-blue-600 hover:bg-blue-700",
      };

  const statusStyle = isEmRota
    ? { label: "Em Rota", bg: "#e0e7ff", text: "#4338ca" }
    : { label: "Pronto", bg: "#dcfce7", text: "#16a34a" };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            {pedido.cliente?.nome}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
          >
            {statusStyle.label}
          </span>
        </div>
        <span className="shrink-0 text-base font-bold text-slate-900">
          {formatBRL(pedido.total)}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {pedido.horarioEntrega}
        </span>
        <span className="flex items-center gap-1">
          <Phone size={12} /> {pedido.cliente?.telefone}
        </span>
        {isRetirada ? (
          <span className="flex items-center gap-1">
            <Store size={12} /> Retirada
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{pedido.endereco}</span>
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-500">
        {pedido.itens.map((item) => (
          <span key={item.id} className="flex items-center gap-1.5">
            {item.imagemReferencia && (
              <MiniaturaImagemReferencia
                src={item.imagemReferencia}
                alt={item.nome}
                size={20}
                onOpen={onViewImage}
              />
            )}
            {item.quantidade}x {item.nome}
          </span>
        ))}
      </div>

      <button
        onClick={onAction}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${actionConfig.className}`}
      >
        <actionConfig.icon size={15} />
        {actionConfig.label}
      </button>
    </div>
  );
}
