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
import { usePedidos } from "./PedidosContext";
import DetalhesPedido from "./DetalhesPedido.jsx";
import EditarPedidoModal from "./EditarPedidoModal";
import {
  FotosReferenciaBadge,
  obterImagensReferenciaPedido,
  LightboxReferencia,
} from "./FotosReferencia";

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

function obterStatusPedido(pedido) {
  if (pedido.status === "entregue") {
    return pedido.tipoEntrega === "retirada"
      ? { label: "Retirado", bg: "#ede9fe", text: "#7c3aed", icon: Store }
      : { label: "Entregue", bg: "#dcfce7", text: "#16a34a", icon: Truck };
  }
  return statusMeta[pedido.status] || statusMeta.recebido;
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
  const { pedidos, atualizarPedido, carregando, erro } = usePedidos();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ status: "", inicio: "", fim: "" });
  const [showHistory, setShowHistory] = useState(false);
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [imagemLightbox, setLightboxImage] = useState(null);

  const today = todayISO();
  const isToday = selectedDate === today;

  /* ---------------- Pedidos da data selecionada ---------------- */
  const pedidosDoDia = useMemo(
    () => pedidos.filter((o) => o.dataEntrega === selectedDate),
    [pedidos, selectedDate]
  );

  const correspondeABusca = (pedido, q) =>
    !q ||
    pedido.cliente?.nome?.toLowerCase().includes(q) ||
    (pedido.cliente?.telefone || "").includes(q) ||
    (pedido.itens || []).some((i) => i.nome.toLowerCase().includes(q));

  const pedidosDoDiaFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return [...pedidosDoDia]
      .filter((o) => correspondeABusca(o, q))
      .sort((a, b) => (a.horarioEntrega || "").localeCompare(b.horarioEntrega || ""));
  }, [pedidosDoDia, busca]);

  const dayStats = useMemo(() => {
    const total = pedidosDoDia.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + (o.total || 0), 0);
    const ativos = pedidosDoDia.filter(
      (o) => o.status !== "entregue" && o.status !== "cancelado"
    ).length;
    return { count: pedidosDoDia.length, total, ativos };
  }, [pedidosDoDia]);

  /* ---------------- Histórico: pedidos já concluídos (entregues,
     retirados ou cancelados), de qualquer data, mais recentes primeiro ---------------- */
  const pedidosHistorico = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = pedidos.filter(
      (o) => o.status === "entregue" || o.status === "cancelado"
    );
    return base
      .filter((o) => correspondeABusca(o, q))
      .sort((a, b) => {
        const da = `${a.dataEntrega || ""} ${a.horarioEntrega || ""}`;
        const db = `${b.dataEntrega || ""} ${b.horarioEntrega || ""}`;
        return db.localeCompare(da);
      });
  }, [pedidos, busca]);

  const listToRender = (showHistory ? pedidosHistorico : pedidosDoDiaFiltrados).filter((p) =>
    (!filtros.status || p.status === filtros.status) && (!filtros.inicio || p.dataEntrega >= filtros.inicio) && (!filtros.fim || p.dataEntrega <= filtros.fim));

  const paginaAtual = Math.min(pagina, Math.max(1, Math.ceil(listToRender.length / 20)));
  const itensPagina = listToRender.slice((paginaAtual - 1) * 20, paginaAtual * 20);
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + ações */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos</h1>
          <p className="mt-1 text-slate-500">
            {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} no total
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
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              showHistory
                ? "Buscar no histórico por cliente, telefone ou item..."
                : "Buscar por cliente, telefone ou item..."
            }
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <details className="mb-4 text-sm text-slate-500"><summary className="cursor-pointer">Mais filtros</summary><div className="mt-3 flex flex-wrap items-center gap-3"><select aria-label="Filtrar status" value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5"><option value="">Todos os status</option>{Object.entries({ recebido: "Recebido", em_producao: "Em produção", pronto: "Pronto", em_rota: "Em rota", entregue: "Entregue / retirado", cancelado: "Cancelado" }).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select>{showHistory && <><label>De <input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2" /></label><label>Até <input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2" /></label></>}</div></details>
      {showHistory && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <History size={15} />
          {pedidosHistorico.length} pedido{pedidosHistorico.length !== 1 ? "s" : ""}{" "}
          concluído{pedidosHistorico.length !== 1 ? "s" : ""} ou cancelado
          {pedidosHistorico.length !== 1 ? "s" : ""}
        </div>
      )}

      {erro && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{erro}</p>}
      {carregando && <p role="status" className="mb-4 text-sm text-slate-400">Carregando pedidos…</p>}
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
              : pedidosDoDia.length === 0
              ? "Nenhum pedido para esta data"
              : "Nenhum pedido encontrado"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {itensPagina.map((pedido, idx) => (
            <PedidoRow
              key={pedido.id}
              pedido={pedido}
              isLast={idx === itensPagina.length - 1}
              showDate={showHistory}
              onEdit={() => setPedidoEmEdicao(pedido)}
              onDetails={() => setDetalhe(pedido.id)}
              onViewImage={setLightboxImage}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-500"><button disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button><span>Página {paginaAtual}</span><button disabled={paginaAtual * 20 >= listToRender.length} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button></div>
      {detalhe && <DetalhesPedido id={detalhe} onClose={() => setDetalhe(null)} />}
      {pedidoEmEdicao && (
        <EditarPedidoModal
          pedido={pedidoEmEdicao}
          onClose={() => setPedidoEmEdicao(null)}
          onSave={(data) => {
            atualizarPedido(pedidoEmEdicao.id, data);
            setPedidoEmEdicao(null);
          }}
        />
      )}

      <LightboxReferencia
        imagem={imagemLightbox}
        onClose={() => setLightboxImage(null)}
      />
    </main>
  );
}

/* ---------------------------------------------------------
   Linha de pedido — usada tanto na lista do dia quanto no histórico
--------------------------------------------------------- */
function PedidoRow({ pedido, isLast, showDate, onEdit, onDetails, onViewImage }) {
  const meta = obterStatusPedido(pedido);
  const payMeta =
    paymentStatusMeta[pedido.statusPagamento] || paymentStatusMeta.pendente;
  const itemsLabel = (pedido.itens || [])
    .map((i) => `${i.quantidade}x ${i.nome}`)
    .join(", ");
  const imagemReferencias = obterImagensReferenciaPedido(pedido);

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
                {toBRDate(pedido.dataEntrega)}
              </span>
              <span className="text-xs text-slate-400">
                {pedido.horarioEntrega}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-700">
              <Clock size={13} className="text-slate-400" />
              {pedido.horarioEntrega}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-900">
            {pedido.cliente?.nome}
            {pedido.pendencia?.impedimentos?.length > 0 && <span className="text-xs text-amber-600">Atualização pendente</span>}
            {pedido.tipoEntrega === "retirada" ? (
              <span className="flex items-center gap-1 text-xs font-normal text-slate-400">
                <Store size={12} /> Retirada
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1 text-xs font-normal text-slate-400">
                <MapPin size={12} className="shrink-0" />
                <span className="max-w-[220px] truncate">{pedido.endereco}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="max-w-[420px] truncate">{itemsLabel}</span>
            <FotosReferenciaBadge images={imagemReferencias} onOpen={onViewImage} />
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
          {formatBRL(pedido.total)}
        </span>
        <button onClick={onDetails} className="text-xs font-semibold text-blue-600 hover:underline">Detalhes</button>
        <button
          disabled={["entregue", "cancelado"].includes(pedido.status) || pedido.legado}
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
