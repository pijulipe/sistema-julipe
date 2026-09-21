import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { usePedidos } from "./PedidosContext";



import EditarPedidoModal from "./EditarPedidoModal";
import { MiniaturaImagemReferencia, LightboxReferencia } from "./FotosReferencia";
import ConsultaPreparo from "./ConsultaPreparo.jsx";
import { alterouPreparo, dataOperacao, filtrarProducao, permissoesProducao } from "./utils/producao.js";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatBRL = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toBRDate = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

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
export default function ProducaoPanel() {
  const { pedidos, acesso, carregando, erro, recarregar, executar } =
    usePedidos();
  const [dateFilter, setDateFilter] = useState("hoje");
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState(null);
  const [pedidoCancelando, setPedidoCancelando] = useState(null);
  const [imagemLightbox, setLightboxImage] = useState(null);
  const [dataEspecifica, setDataEspecifica] = useState("");
  const [consulta, setConsulta] = useState(null);
  const [ocupados, setOcupados] = useState({});
  const [errosAcoes, setErrosAcoes] = useState({});
  const [alteracoes, setAlteracoes] = useState({});
  const anteriores = useRef(new Map());
  const emAndamento = useRef(new Set());
  const today = dataOperacao();
  const permissoes = permissoesProducao(acesso);

  useEffect(() => {
    const novas = {};
    for (const pedido of pedidos) {
      const anterior = anteriores.current.get(pedido.id);
      if (anterior && anterior.revisao !== pedido.revisao && alterouPreparo(anterior.fotografia, pedido.fotografia)) novas[pedido.id] = pedido.revisao;
    }
    anteriores.current = new Map(pedidos.map((pedido) => [pedido.id, pedido]));
    if (Object.keys(novas).length) setAlteracoes((atuais) => ({ ...atuais, ...novas }));
  }, [pedidos]);

  const filtrados = useMemo(() => filtrarProducao(pedidos, { periodo: dateFilter, data: dataEspecifica, pagamento: statusFilter, busca, hoje: today }), [pedidos, dateFilter, dataEspecifica, statusFilter, busca, today]);

  async function agir(pedido, acao, campos = {}) {
    if (emAndamento.current.has(pedido.id)) return false;
    emAndamento.current.add(pedido.id);
    setOcupados((atuais) => ({ ...atuais, [pedido.id]: true }));
    setErrosAcoes((atuais) => ({ ...atuais, [pedido.id]: "" }));
    try {
      await executar(pedido.id, acao, { revisao: pedido.revisao, ...campos });
      return true;
    } catch (falha) {
      setErrosAcoes((atuais) => ({ ...atuais, [pedido.id]: falha.status === 409 ? "Pedido alterado por outra operação. Confira os dados atualizados antes de tentar novamente." : falha.message }));
      return false;
    } finally {
      emAndamento.current.delete(pedido.id);
      setOcupados((atuais) => ({ ...atuais, [pedido.id]: false }));
    }
  }

  const grouped = {
    recebido: filtrados.filter((o) => o.status === "recebido"),
    em_producao: filtrados.filter((o) => o.status === "em_producao"),
    pronto: filtrados.filter((o) => o.status === "pronto"),
  };

  const handleConfirmarCancelamento = async () => {
    if (!pedidoCancelando) return;
    const resultado = await agir(pedidoCancelando, "cancelamento");
    if (resultado) setPedidoCancelando(null);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Painel de Produção
        </h1>
        <p className="mt-1 text-slate-500">
          {filtrados.length} pedido{filtrados.length !== 1 ? "s" : ""} em
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

        <input type="date" aria-label="Consultar data específica" value={dateFilter === "data" ? dataEspecifica : ""} onChange={(evento) => { setDataEspecifica(evento.target.value); setDateFilter(evento.target.value ? "data" : "hoje"); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <div className="relative min-w-[240px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
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

      {carregando && <p role="status" className="mb-4 text-sm text-slate-500">Carregando pedidos…</p>}
      {erro && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro} {pedidos.length > 0 && "Os dados exibidos podem estar desatualizados."} <button onClick={recarregar} className="font-semibold underline">Tentar novamente</button></div>}
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
                  {carregando ? "Carregando…" : erro ? "Consulta indisponível" : "Nenhum pedido"}
                </div>
              ) : (
                grouped[col.key].map((pedido) => (
                  <CardPedido
                    key={pedido.id}
                    pedido={pedido}
                    onAdvance={() => agir(pedido, "status", { status: pedido.status === "recebido" ? "EM_PRODUCAO" : "PRONTO" })}
                    onRevert={() => agir(pedido, "status", { status: pedido.status === "pronto" ? "EM_PRODUCAO" : "RECEBIDO" })}
                    onEdit={() => setPedidoEmEdicao(pedido)}
                    onCancel={() => { setErrosAcoes((atuais) => ({ ...atuais, [pedido.id]: "" })); setPedidoCancelando(pedido); }}
                    onViewImage={setLightboxImage}
                    onConsultar={() => setConsulta(pedido.id)}
                    atrasado={Boolean(pedido.dataEntrega && pedido.dataEntrega < today)}
                    alterado={alteracoes[pedido.id]}
                    permissoes={permissoes}
                    ocupado={ocupados[pedido.id]}
                    erro={errosAcoes[pedido.id]}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {pedidoEmEdicao && permissoes.editar && (
        <EditarPedidoModal
          pedido={pedidoEmEdicao}
          onClose={() => setPedidoEmEdicao(null)}
        />
      )}

      {pedidoCancelando && permissoes.cancelar && (
        <ModalCancelarPedido
          pedido={pedidoCancelando}
          onClose={() => setPedidoCancelando(null)}
          onConfirm={handleConfirmarCancelamento}
          ocupado={ocupados[pedidoCancelando.id]}
          erro={errosAcoes[pedidoCancelando.id]}
        />
      )}

      {consulta && <ConsultaPreparo id={consulta} onClose={() => setConsulta(null)} />}

      <LightboxReferencia
        imagem={imagemLightbox}
        onClose={() => setLightboxImage(null)}
      />
    </main>
  );
}

/* ---------------------------------------------------------
   Modal de confirmação de cancelamento
--------------------------------------------------------- */
function ModalCancelarPedido({ pedido, onClose, onConfirm, ocupado, erro }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={ocupado ? undefined : onClose}
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
            O pedido de <span className="font-semibold text-slate-700">{pedido.cliente?.nome}</span> será
            marcado como cancelado e sairá do painel de produção. Somente o gerente poderá reabrir o pedido.
          </p>
          {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro} Feche esta confirmação e confira o pedido antes de repetir.</p>}
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button
            onClick={onClose}
            disabled={ocupado}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={ocupado || Boolean(erro)}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {ocupado ? "Cancelando…" : "Cancelar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Card de pedido
--------------------------------------------------------- */
function CardPedido({ pedido, onAdvance, onRevert, onEdit, onCancel, onViewImage, onConsultar, atrasado, alterado, permissoes, ocupado, erro }) {
  const payMeta =
    paymentStatusMeta[pedido.statusPagamento] || paymentStatusMeta.pendente;
  const isRetirada = pedido.tipoEntrega === "retirada";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Cliente + status de pagamento + editar */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900">
          {pedido.cliente?.nome}<span className="block text-xs font-normal text-slate-400">Pedido #{pedido.id}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {permissoes.editar && <button
            onClick={onEdit}
            disabled={ocupado || pedido.legado}
            className="text-slate-400 transition-colors hover:text-blue-600"
            aria-label="Editar pedido"
          >
            <Pencil size={15} />
          </button>}
          {permissoes.cancelar && <button
            onClick={onCancel}
            disabled={ocupado || pedido.legado}
            className="text-slate-400 transition-colors hover:text-red-600"
            aria-label="Cancelar pedido"
            title="Cancelar pedido"
          >
            <Ban size={15} />
          </button>}
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
          <Clock size={12} /> {pedido.horarioEntrega}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          {toBRDate(pedido.dataEntrega)}
        </span>
        {atrasado && <span className="font-semibold text-red-600">Atrasado</span>}
      </div>

      {/* Itens do pedido */}
      <div className="mb-4 space-y-1.5">
        {pedido.itens.map((item) => (
          <div
            key={item.chaveItem || item.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-amber-50/80 px-3 py-2.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 font-medium text-amber-900">
              {item.imagemReferencia && (
                <MiniaturaImagemReferencia
                  src={item.imagemReferencia}
                  alt={item.nome}
                  size={24}
                  onOpen={onViewImage}
                />
              )}
              <span className="truncate">
                {item.quantidade}x {item.nome}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-amber-900">
              {formatBRL(Number(item.subtotalCentavos) / 100)}
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
            <span className="truncate">{pedido.endereco}</span>
          </span>
        )}
        <span className="shrink-0 text-base font-bold text-slate-900">
          {formatBRL(pedido.total)}
        </span>
      </div>

      <button onClick={onConsultar} className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-700">Consultar preparo e alterações</button>
      {alterado && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Preparo alterado durante esta consulta · revisão {alterado}. Consulte o histórico.</p>}
      {(pedido.pendencia?.impedimentos?.length > 0 || pedido.fotografia?.avisos?.length > 0 || pedido.legado) && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pendências para atenção da equipe. Consulte os detalhes.</p>}
      {erro && <p role="alert" className="mb-3 text-sm text-red-600">{erro}</p>}

      {permissoes.operar && <fieldset disabled={ocupado || pedido.legado} className="space-y-2 disabled:opacity-50">
      {ocupado && <p role="status" className="text-xs text-slate-500">Salvando alteração…</p>}
      {pedido.status !== "pronto" ? (
        <button
          onClick={onAdvance}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Avançar para {pedido.status === "recebido" ? "Em Produção" : "Pronto"}
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
      {pedido.status === "em_producao" && <button onClick={onRevert} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"><ArrowLeft size={15} />Voltar para Recebido</button>}
      </fieldset>}
    </div>
  );
}
