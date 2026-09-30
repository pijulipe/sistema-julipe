import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  ShoppingCart,
  Users,
  DollarSign,
  Activity,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  ShoppingBag,
  TrendingUp,
  Truck,
  Cake,
  BarChart3,
  Wallet,
  Clock,
  TrendingDown,
} from "lucide-react";
import { usePedidos } from "./PedidosContext";
import ResumoFinanceiroPedidos from "./ResumoFinanceiroPedidos.jsx";
import { categorias as listaCategoriaProduto } from "./categoriasProdutos";

import { construirVendasProdutos, itensVendidos, resumirFinanceiro, pedidosPorHora, vendaValida, emReais } from "./utils/relatorios.js";

/* ---------------------------------------------------------
   Helpers de data/formatação
--------------------------------------------------------- */
const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const fromISO = (iso) => new Date(`${iso}T00:00:00`);
const todayISO = () => toISO(new Date());

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const toBRDate = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function eachDayISO(start, end) {
  const days = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    days.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Arredonda para um valor "redondo" acima, usado nas linhas de grade dos gráficos. */
function niceMax(value) {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const residual = value / magnitude;
  let niceResidual;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  return niceResidual * magnitude;
}

/* ---------------------------------------------------------
   Faixas de data (presets do topo)
--------------------------------------------------------- */
const rangePresets = [
  { key: "hoje", label: "Hoje" },
  { key: "7dias", label: "7 dias" },
  { key: "30dias", label: "30 dias" },
  { key: "mes", label: "Este mês" },
  { key: "tudo", label: "Tudo" },
];

function computeRange(preset, pedidos, custom) {
  const today = fromISO(todayISO());

  if (preset === "custom" && custom.start && custom.end) {
    return { start: fromISO(custom.start), end: fromISO(custom.end) };
  }
  if (preset === "tudo") {
    const validDates = pedidos
      .map((o) => (o.dataEntrega ? fromISO(o.dataEntrega) : null))
      .filter((d) => d && !Number.isNaN(d.getTime()));
    if (validDates.length === 0) {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    const start = new Date(Math.min(...validDates.map((d) => d.getTime())));
    const end = new Date(
      Math.max(today.getTime(), ...validDates.map((d) => d.getTime()))
    );
    return { start, end };
  }
  if (preset === "mes") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start, end };
  }
  if (preset === "7dias") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start, end: today };
  }
  if (preset === "30dias") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start, end: today };
  }
  // "hoje"
  return { start: today, end: today };
}

/* ---------------------------------------------------------
   Exportação CSV (usada tanto pelo botão CSV quanto Sheets —
   um .csv abre direto no Google Sheets via importação).
--------------------------------------------------------- */
function exportarPedidosCSV(pedidos) {
  const header = [
    "Data",
    "Horário",
    "Cliente",
    "Telefone",
    "Itens",
    "Subtotal",
    "Desconto",
    "Total",
    "Status",
    "Tipo",
    "Pagamento",
  ];
  const rows = pedidos.map((o) => [
    o.dataEntrega || "",
    o.horarioEntrega || "",
    o.cliente?.nome || "",
    o.cliente?.telefone || "",
    (o.itens || []).map((i) => `${i.quantidade}x ${i.nome}`).join(" | "),
    (o.subtotal || 0).toFixed(2).replace(".", ","),
    (o.valorDesconto || 0).toFixed(2).replace(".", ","),
    (o.total || 0).toFixed(2).replace(".", ","),
    o.status || "",
    o.tipoEntrega || "",
    o.statusPagamento || "",
  ]);

  const csvContent = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-julipe-${todayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   Metadados usados nos gráficos de pagamento da aba Financeiro.
--------------------------------------------------------- */
const PAYMENT_METHOD_META = {
  pix: { label: "PIX", color: "#10b981" },
  debito: { label: "Débito", color: "#3b82f6" },
  credito: { label: "Crédito", color: "#a855f7" },
};

const PAYMENT_STATUS_META = {
  pago: { label: "Pago", color: "#16a34a" },
  parcial: { label: "Parcial", color: "#f59e0b" },
  pendente: { label: "Pendente", color: "#ef4444" },
};

/* ---------------------------------------------------------
   Hook: dispara a animação de entrada de um gráfico sempre
   que os dados (dep) mudam — dá o efeito de "desenhar" o
   gráfico do zero a cada novo filtro.
--------------------------------------------------------- */
function useEnterAnimation(dep) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [dep]);
  return ready;
}

/* ---------------------------------------------------------
   Gráfico de linha — Faturamento por Dia
--------------------------------------------------------- */
function RevenueLineChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);

  const W = 760;
  const H = 260;
  const PAD = { left: 48, right: 16, top: 16, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxValue = niceMax(Math.max(...data.map((d) => d.value), 0));
  const n = data.length;

  const xFor = (i) =>
    n <= 1 ? PAD.left + innerW / 2 : PAD.left + (innerW * i) / (n - 1);
  const yFor = (v) => PAD.top + innerH - (v / maxValue) * innerH;

  const points = data.map((d, i) => ({ ...d, x: xFor(i), y: yFor(d.value) }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const baseY = PAD.top + innerH;
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${baseY} L ${points[0].x.toFixed(2)} ${baseY} Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + innerH * (1 - t),
    label: Math.round(maxValue * t),
  }));

  const labelStep = n > 10 ? Math.ceil(n / 8) : 1;
  const hovered = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
        <defs>
          <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <clipPath id="revenue-reveal">
            <rect
              x="0"
              y="0"
              width={ready ? W : 0}
              height={H}
              style={{ transition: "width 900ms cubic-bezier(.4,0,.2,1)" }}
            />
          </clipPath>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={g.y}
              x2={W - PAD.right}
              y2={g.y}
              stroke="#eef2f7"
              strokeDasharray="4 4"
            />
            <text x={PAD.left - 10} y={g.y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== n - 1) return null;
          return (
            <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {toBRDate(p.date)}
            </text>
          );
        })}

        <g clipPath="url(#revenue-reveal)">
          {areaPath && <path d={areaPath} fill="url(#revenue-gradient)" stroke="none" />}
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5.5 : 3}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth="1.5"
              style={{ transition: "r 150ms" }}
            />
          ))}
        </g>

        {hovered && (
          <line
            x1={hovered.x}
            y1={PAD.top}
            x2={hovered.x}
            y2={PAD.top + innerH}
            stroke="#94a3b8"
            strokeDasharray="3 3"
          />
        )}

        {points.map((p, i) => {
          const bandW = n <= 1 ? innerW : innerW / (n - 1);
          return (
            <rect
              key={`hit-${i}`}
              x={p.x - bandW / 2}
              y={PAD.top}
              width={bandW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            />
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{
            left: `${(hovered.x / W) * 100}%`,
            top: `${(hovered.y / H) * 100}%`,
            marginTop: -10,
          }}
        >
          <div className="font-semibold">{toBRDate(hovered.date)}</div>
          <div className="text-slate-300">{formatBRL(hovered.value)}</div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Gráfico de barras — Pedidos por Dia da Semana
--------------------------------------------------------- */
function WeekdayBarChart({ data, unitLabel = "pedido" }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);

  const W = 380;
  const H = 260;
  const PAD = { left: 30, right: 12, top: 16, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxValue = niceMax(Math.max(...data.map((d) => d.value), 0));
  const n = data.length;
  const gap = 10;
  const barW = (innerW - gap * (n - 1)) / n;

  const gridLines = [0, 0.5, 1].map((t) => ({
    y: PAD.top + innerH * (1 - t),
    label: Math.round(maxValue * t),
  }));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#eef2f7" strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD.left + i * (barW + gap);
          const fullH = maxValue > 0 ? (d.value / maxValue) * innerH : 0;
          const h = ready ? fullH : 0;
          const y = PAD.top + innerH - h;
          const isHover = hoverIdx === i;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                fill={isHover ? "#2563eb" : "#93c5fd"}
                style={{
                  transition:
                    "height 700ms cubic-bezier(.4,0,.2,1), y 700ms cubic-bezier(.4,0,.2,1), fill 150ms",
                }}
              />
              <rect
                x={x}
                y={PAD.top}
                width={barW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
              />
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isHover ? 700 : 500}
                fill={isHover ? "#1e293b" : "#94a3b8"}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIdx != null &&
        (() => {
          const d = data[hoverIdx];
          const x = PAD.left + hoverIdx * (barW + gap) + barW / 2;
          const fullH = maxValue > 0 ? (d.value / maxValue) * innerH : 0;
          const y = PAD.top + innerH - fullH;
          return (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, marginTop: -10 }}
            >
              <div className="font-semibold">{d.label}</div>
              <div className="text-slate-300">
                {d.value} {unitLabel}{d.value !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

/* ---------------------------------------------------------
   Funil de Pedidos — barras horizontais por status
--------------------------------------------------------- */
function DicaBarra({ children }) {
  const elemento = useRef(null);
  const [alinharDentro, setAlinharDentro] = useState(false);

  useLayoutEffect(() => {
    const ajustar = () => {
      const dica = elemento.current;
      const barra = dica.parentElement.getBoundingClientRect();
      setAlinharDentro(barra.right + 8 + dica.offsetWidth > document.documentElement.clientWidth - 8);
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [children]);

  return (
    <div
      ref={elemento}
      className={`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg ${alinharDentro ? "right-0" : "left-full ml-2"}`}
    >
      {children}
    </div>
  );
}

function StatusFunnelChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="space-y-3">
        {data.map((d, i) => {
          const pct = (d.value / maxValue) * 100;
          const width = ready ? pct : 0;
          const isHover = hoverIdx === i;
          return (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-500">
                {d.label}
              </span>
              <div
                className="relative h-8 flex-1 rounded-lg bg-slate-50"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
              >
                <div
                  className="h-full rounded-lg"
                  style={{
                    width: `${width}%`,
                    backgroundColor: d.color,
                    opacity: isHover ? 1 : 0.9,
                    transition: "width 700ms cubic-bezier(.4,0,.2,1), opacity 150ms",
                  }}
                />
                {isHover && (
                  <DicaBarra>
                    {d.value} pedido{d.value !== 1 ? "s" : ""}
                  </DicaBarra>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 pl-[6.5rem]">
        <div className="flex flex-1 justify-between text-[10px] text-slate-400">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Lista de barras horizontais genérica — usada em Top Produtos
   por Faturamento/Quantidade.
--------------------------------------------------------- */
function HorizontalBarList({ data, color = "#f59e0b", formatValue = (v) => String(v), emptyLabel = "Sem dados no período" }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center">
        <p className="text-center text-sm text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="space-y-3">
        {data.map((d, i) => {
          const pct = (d.value / maxValue) * 100;
          const width = ready ? pct : 0;
          const isHover = hoverIdx === i;
          return (
            <div key={`${d.label}-${i}`} className="flex items-center gap-3">
              <span
                className="w-28 shrink-0 truncate text-right text-xs font-medium text-slate-500"
                title={d.label}
              >
                {d.label}
              </span>
              <div
                className="relative h-8 flex-1 rounded-lg bg-slate-50"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
              >
                <div
                  className="h-full rounded-lg"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                    opacity: isHover ? 1 : 0.9,
                    transition: "width 700ms cubic-bezier(.4,0,.2,1), opacity 150ms",
                  }}
                />
                {isHover && (
                  <DicaBarra>
                    {formatValue(d.value)}
                  </DicaBarra>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 pl-[7.5rem]">
        <div className="flex flex-1 justify-between text-[10px] text-slate-400">
          <span>0</span>
          <span>{formatValue(maxValue)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Gráfico de rosca (donut) — Vendas por Categoria
--------------------------------------------------------- */
function GraficoDonutCategoria({ data, formatValue = formatBRL, emptyLabel = "Sem vendas no período" }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const size = 220;
  const strokeWidth = 30;
  // O anel cresce um pouco no hover para dar destaque ao segmento — esse
  // espaço extra já é reservado aqui no raio, para que o traço mais
  // grosso nunca ultrapasse os limites do SVG (o que antes cortava/
  // deformava o gráfico ao passar o mouse).
  const hoverGrowth = 6;
  const radius = (size - strokeWidth - hoverGrowth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total <= 0) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center">
        <p className="text-center text-sm text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const startFraction = cumulative;
    cumulative += fraction;
    return { ...d, fraction, startFraction };
  });

  const ativo = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: "visible" }}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segments.map((s, i) => {
              const dash = ready ? s.fraction * circumference : 0;
              const gapDash = circumference - dash;
              const offset = ready ? -s.startFraction * circumference : 0;
              const isHover = hoverIdx === i;
              return (
                <circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={isHover ? strokeWidth + hoverGrowth : strokeWidth}
                  strokeDasharray={`${dash} ${gapDash}`}
                  strokeDashoffset={offset}
                  style={{
                    filter: isHover ? "drop-shadow(0 3px 6px rgba(15, 23, 42, 0.22))" : "none",
                    transition:
                      "stroke-dasharray 700ms cubic-bezier(.4,0,.2,1), stroke-width 200ms ease, filter 200ms ease",
                  }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="text-lg font-bold text-slate-900">
            {formatValue(ativo ? ativo.value : total)}
          </span>
          <span className="text-xs text-slate-400">{ativo ? ativo.label : "Total"}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:flex-col sm:items-start">
        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            className="flex items-center gap-2 text-sm text-slate-600"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Gráfico de barras verticais genérico — usado em Pedidos por Horário
--------------------------------------------------------- */
function HourlyBarChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);

  const W = 760;
  const H = 240;
  const PAD = { left: 34, right: 12, top: 16, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxValue = niceMax(Math.max(...data.map((d) => d.value), 0));
  const n = data.length;
  const gap = 6;
  const barW = (innerW - gap * (n - 1)) / n;

  const gridLines = [0, 0.5, 1].map((t) => ({
    y: PAD.top + innerH * (1 - t),
    label: Math.round(maxValue * t),
  }));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#eef2f7" strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD.left + i * (barW + gap);
          const fullH = maxValue > 0 ? (d.value / maxValue) * innerH : 0;
          const h = ready ? fullH : 0;
          const y = PAD.top + innerH - h;
          const isHover = hoverIdx === i;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={isHover ? "#16a34a" : "#86efac"}
                style={{
                  transition:
                    "height 700ms cubic-bezier(.4,0,.2,1), y 700ms cubic-bezier(.4,0,.2,1), fill 150ms",
                }}
              />
              <rect
                x={x}
                y={PAD.top}
                width={barW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
              />
              {(i % 2 === 0 || i === data.length - 1) && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hoverIdx != null &&
        (() => {
          const d = data[hoverIdx];
          const x = PAD.left + hoverIdx * (barW + gap) + barW / 2;
          const fullH = maxValue > 0 ? (d.value / maxValue) * innerH : 0;
          const y = PAD.top + innerH - fullH;
          return (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, marginTop: -10 }}
            >
              <div className="font-semibold">{d.label}</div>
              <div className="text-slate-300">
                {d.value} pedido{d.value !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

/* ---------------------------------------------------------
   Gráfico de múltiplas linhas — Histórico Comparativo por
   Categoria (Mensal)
--------------------------------------------------------- */
function GraficoHistoricoCategoria({ months, series }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(months);

  const W = 760;
  const H = 300;
  const PAD = { left: 48, right: 16, top: 16, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxValue = niceMax(Math.max(...allValues, 0));
  const n = months.length;

  const xFor = (i) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (innerW * i) / (n - 1));
  const yFor = (v) => PAD.top + innerH - (v / maxValue) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + innerH * (1 - t),
    label: Math.round(maxValue * t),
  }));

  const hovered = hoverIdx != null ? months[hoverIdx] : null;
  const hoveredX = hoverIdx != null ? xFor(hoverIdx) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 300 }}>
        <defs>
          <clipPath id="categoria-history-reveal">
            <rect
              x="0"
              y="0"
              width={ready ? W : 0}
              height={H}
              style={{ transition: "width 900ms cubic-bezier(.4,0,.2,1)" }}
            />
          </clipPath>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#eef2f7" strokeDasharray="4 4" />
            <text x={PAD.left - 10} y={g.y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}

        {months.map((m, i) => (
          <text key={m.key} x={xFor(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
            {m.label}
          </text>
        ))}

        <g clipPath="url(#categoria-history-reveal)">
          {series.map((s) => {
            const path = s.values
              .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`)
              .join(" ");
            return (
              <g key={s.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {s.values.map((v, i) => (
                  <circle
                    key={i}
                    cx={xFor(i)}
                    cy={yFor(v)}
                    r={hoverIdx === i ? 4.5 : 2.5}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth="1.5"
                    style={{ transition: "r 150ms" }}
                  />
                ))}
              </g>
            );
          })}
        </g>

        {hovered && (
          <line
            x1={hoveredX}
            y1={PAD.top}
            x2={hoveredX}
            y2={PAD.top + innerH}
            stroke="#94a3b8"
            strokeDasharray="3 3"
          />
        )}

        {months.map((m, i) => {
          const bandW = n <= 1 ? innerW : innerW / (n - 1);
          return (
            <rect
              key={`hit-${m.key}`}
              x={xFor(i) - bandW / 2}
              y={PAD.top}
              width={bandW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            />
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-white px-4 py-3 text-xs shadow-xl ring-1 ring-slate-100"
          style={{ left: `${(hoveredX / W) * 100}%`, top: `${(PAD.top / H) * 100}%`, marginTop: -10 }}
        >
          <div className="mb-1.5 font-semibold text-slate-900">{hovered.label}</div>
          <div className="space-y-1">
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="font-medium" style={{ color: s.color }}>
                  {s.label}:
                </span>
                <span className="text-slate-600">{formatBRL(s.values[hoverIdx])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-sm text-slate-600">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Gráfico de linhas duplas — Faturamento e Descontos por Dia
--------------------------------------------------------- */
function RevenueDiscountLineChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);

  const W = 760;
  const H = 260;
  const PAD = { left: 48, right: 16, top: 16, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const series = [
    { key: "faturamento", label: "Faturamento", color: "#16a34a", accessor: (d) => d.faturamento },
    { key: "descontos", label: "Descontos", color: "#ef4444", accessor: (d) => d.descontos },
  ];

  const maxValue = niceMax(
    Math.max(...data.flatMap((d) => series.map((s) => s.accessor(d))), 0)
  );
  const n = data.length;

  const xFor = (i) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (innerW * i) / (n - 1));
  const yFor = (v) => PAD.top + innerH - (v / maxValue) * innerH;

  const linesData = series.map((s) => ({
    ...s,
    points: data.map((d, i) => ({ x: xFor(i), y: yFor(s.accessor(d)) })),
  }));

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + innerH * (1 - t),
    label: Math.round(maxValue * t),
  }));

  const labelStep = n > 10 ? Math.ceil(n / 8) : 1;
  const hovered = hoverIdx != null ? data[hoverIdx] : null;
  const hoveredX = hoverIdx != null ? xFor(hoverIdx) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
        <defs>
          <clipPath id="revenue-discount-reveal">
            <rect
              x="0"
              y="0"
              width={ready ? W : 0}
              height={H}
              style={{ transition: "width 900ms cubic-bezier(.4,0,.2,1)" }}
            />
          </clipPath>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#eef2f7" strokeDasharray="4 4" />
            <text x={PAD.left - 10} y={g.y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== n - 1) return null;
          return (
            <text key={i} x={xFor(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {toBRDate(d.date)}
            </text>
          );
        })}

        <g clipPath="url(#revenue-discount-reveal)">
          {linesData.map((s) => {
            const path = s.points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
              .join(" ");
            return (
              <g key={s.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {s.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoverIdx === i ? 5.5 : 3}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth="1.5"
                    style={{ transition: "r 150ms" }}
                  />
                ))}
              </g>
            );
          })}
        </g>

        {hovered && (
          <line
            x1={hoveredX}
            y1={PAD.top}
            x2={hoveredX}
            y2={PAD.top + innerH}
            stroke="#94a3b8"
            strokeDasharray="3 3"
          />
        )}

        {data.map((d, i) => {
          const bandW = n <= 1 ? innerW : innerW / (n - 1);
          return (
            <rect
              key={`hit-${i}`}
              x={xFor(i) - bandW / 2}
              y={PAD.top}
              width={bandW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            />
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: `${(hoveredX / W) * 100}%`, top: `${(PAD.top / H) * 100}%`, marginTop: -10 }}
        >
          <div className="mb-1 font-semibold">{toBRDate(hovered.date)}</div>
          <div className="space-y-0.5">
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="font-medium" style={{ color: s.color }}>
                  {s.label}:
                </span>
                <span className="text-slate-300">{formatBRL(s.accessor(hovered))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Gráfico de barras verticais coloridas por categoria — usado
   em Distribuição de Status. Cada barra carrega sua própria cor
   (d.color), diferente do WeekdayBarChart (sempre azul).
--------------------------------------------------------- */
function StatusBarChart({ data, emptyLabel = "Sem pedidos no período selecionado" }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const ready = useEnterAnimation(data);

  if (!data || data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  const W = 380;
  const H = 260;
  const PAD = { left: 30, right: 12, top: 16, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxValue = niceMax(Math.max(...data.map((d) => d.value), 0));
  const n = data.length;
  const gap = 10;
  const barW = (innerW - gap * (n - 1)) / n;

  const gridLines = [0, 0.5, 1].map((t) => ({
    y: PAD.top + innerH * (1 - t),
    label: Math.round(maxValue * t),
  }));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#eef2f7" strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {g.label}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD.left + i * (barW + gap);
          const fullH = maxValue > 0 ? (d.value / maxValue) * innerH : 0;
          const h = ready ? fullH : 0;
          const y = PAD.top + innerH - h;
          const isHover = hoverIdx === i;
          return (
            <g key={d.key || d.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                fill={d.color}
                opacity={isHover ? 1 : 0.85}
                style={{
                  transition:
                    "height 700ms cubic-bezier(.4,0,.2,1), y 700ms cubic-bezier(.4,0,.2,1), opacity 150ms",
                }}
              />
              <rect
                x={x}
                y={PAD.top}
                width={barW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
              />
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isHover ? 700 : 500}
                fill={isHover ? "#1e293b" : "#94a3b8"}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIdx != null &&
        (() => {
          const d = data[hoverIdx];
          const x = PAD.left + hoverIdx * (barW + gap) + barW / 2;
          const fullH = maxValue > 0 ? (d.value / maxValue) * innerH : 0;
          const y = PAD.top + innerH - fullH;
          return (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, marginTop: -10 }}
            >
              <div className="font-semibold">{d.label}</div>
              <div className="text-slate-300">
                {d.value} pedido{d.value !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

/* ---------------------------------------------------------
   Cartão de estatística
--------------------------------------------------------- */
function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-xl font-bold leading-tight text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   Cartão de gráfico (com título + conteúdo)
--------------------------------------------------------- */
function ChartCard({ title, subtitle, children }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="mb-1 text-xs text-slate-400">{subtitle}</p>}
      <div className={`flex-1 ${subtitle ? "mt-3" : "mt-4"}`}>{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main component
--------------------------------------------------------- */
const tabs = [
  { key: "visao-geral", label: "Visão Geral", icon: LayoutGrid, clickable: true },
  { key: "vendas", label: "Vendas", icon: ShoppingCart, clickable: true },
  { key: "clientes", label: "Clientes", icon: Users, clickable: true },
  { key: "financeiro", label: "Financeiro", icon: DollarSign, clickable: true },
  { key: "operacional", label: "Operacional", icon: Activity, clickable: true },
];

export default function RelatoriosPanel() {
  const { pedidos, carregando, erro, recarregar } = usePedidos();
  const [tab, setTab] = useState("visao-geral");
  const [preset, setPreset] = useState("hoje");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [intervaloAplicado, setIntervaloAplicado] = useState({ start: "", end: "" });
  const [tentandoNovamente, setTentandoNovamente] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [busca, setBusca] = useState("");

  const { start, end } = useMemo(
    () => computeRange(preset, pedidos, intervaloAplicado),
    [preset, pedidos, intervaloAplicado]
  );

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((o) => {
      if (!o.dataEntrega) return false;
      const d = fromISO(o.dataEntrega);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [pedidos, start, end]);

  /* -------- métricas -------- */
  const resumo = useMemo(() => resumirFinanceiro(pedidosFiltrados), [pedidosFiltrados]);
  const faturamento = emReais(resumo.faturamentoCentavos);
  const vendasValidas = pedidosFiltrados.filter(vendaValida).length;
  const totalPedidos = pedidosFiltrados.length;
  const ticketMedio = vendasValidas > 0 ? faturamento / vendasValidas : 0;
  const entregaCount = pedidosFiltrados.filter((o) => o.tipoEntrega !== "retirada").length;
  const taxaEntrega = totalPedidos > 0 ? (entregaCount / totalPedidos) * 100 : 0;
  const clientesUnicos = useMemo(
    () => new Set(pedidosFiltrados.map((o) => o.cliente?.id).filter((id) => id != null)).size,
    [pedidosFiltrados]
  );
  const produtosVendidos = useMemo(() => construirVendasProdutos(pedidosFiltrados).length, [pedidosFiltrados]);

  const stats = [
    { key: "faturamento", label: "Faturamento", value: formatBRL(faturamento), icon: DollarSign, color: "#16a34a", bg: "#f0fdf4" },
    { key: "pedidos", label: "Pedidos", value: String(totalPedidos), icon: ShoppingBag, color: "#9333ea", bg: "#faf5ff" },
    { key: "ticket", label: "Ticket Médio", value: formatBRL(ticketMedio), icon: TrendingUp, color: "#9333ea", bg: "#faf5ff" },
    { key: "entrega", label: "Taxa de Entrega", value: `${Math.round(taxaEntrega)}%`, icon: Truck, color: "#ea580c", bg: "#fff7ed" },
    { key: "clientes", label: "Clientes", value: String(clientesUnicos), icon: Users, color: "#db2777", bg: "#fce7f3" },
    { key: "produtos", label: "Produtos/combos distintos", value: String(produtosVendidos), icon: Cake, color: "#4338ca", bg: "#e0e7ff" },
  ];

  /* -------- Faturamento por dia (respeita o período selecionado) -------- */
  const dailyRevenue = useMemo(() => {
    const days = eachDayISO(start, end);
    const totals = {};
    pedidosFiltrados.forEach((o) => {
      totals[o.dataEntrega] = (totals[o.dataEntrega] || 0n) + (vendaValida(o) ? BigInt(o.fotografia.totalCentavos) : 0n);
    });
    return days.map((iso) => ({ date: iso, value: emReais(totals[iso] || 0n) }));
  }, [pedidosFiltrados, start, end]);

  /* -------- Pedidos por dia da semana (padrão histórico — usa todos os
     pedidos, não só o período selecionado, já que com filtros curtos como
     "Hoje" só haveria um único dia da semana com dado) -------- */
  const pedidosPorDiaSemana = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    pedidos.forEach((o) => {
      if (!o.dataEntrega) return;
      const d = fromISO(o.dataEntrega);
      if (!Number.isNaN(d.getTime())) counts[d.getDay()] += 1;
    });
    return WEEKDAYS.map((label, i) => ({ label, value: counts[i] }));
  }, [pedidos]);

  /* -------- Funil de pedidos (respeita o período selecionado) -------- */
  const funnelData = useMemo(() => {
    const buckets = [
      { key: "recebido", label: "Recebido", color: "#f59e0b" },
      { key: "em_producao", label: "Em Produção", color: "#f97316" },
      { key: "pronto", label: "Pronto", color: "#22c55e" },
      { key: "em_rota", label: "Em Rota", color: "#6366f1" },
      { key: "entregue", label: "Entregue", color: "#8b5cf6" },
      { key: "retirado", label: "Retirado", color: "#a855f7" },
      { key: "cancelado", label: "Cancelado", color: "#ef4444" },
    ];
    const counts = {
      recebido: 0,
      em_producao: 0,
      pronto: 0,
      em_rota: 0,
      entregue: 0,
      retirado: 0,
      cancelado: 0,
    };
    pedidosFiltrados.forEach((o) => {
      if (o.status === "entregue") {
        if (o.tipoEntrega === "retirada") counts.retirado += 1;
        else counts.entregue += 1;
      } else if (counts[o.status] !== undefined) {
        counts[o.status] += 1;
      }
    });
    return buckets.map((b) => ({ ...b, value: counts[b.key] }));
  }, [pedidosFiltrados]);

  /* -------- Aba Vendas: vendas por produto (respeita o período) -------- */
  const listaVendasProdutos = useMemo(() => construirVendasProdutos(pedidosFiltrados), [pedidosFiltrados]);

  const topProdutosFaturamento = useMemo(
    () =>
      [...listaVendasProdutos]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((p) => ({ label: p.nome, value: p.revenue })),
    [listaVendasProdutos]
  );

  const topProdutosQuantidade = useMemo(
    () =>
      [...listaVendasProdutos]
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 6)
        .map((p) => ({ label: p.nome, value: p.quantidade })),
    [listaVendasProdutos]
  );

  const detalhamentoProdutos = useMemo(
    () => [...listaVendasProdutos].sort((a, b) => b.revenue - a.revenue),
    [listaVendasProdutos]
  );

  /* -------- Vendas por Categoria (respeita o período) -------- */
  const vendasPorCategoria = useMemo(() => {
    const totals = {};
    pedidosFiltrados.flatMap(itensVendidos).forEach((p) => {
      totals[p.categoria] = (totals[p.categoria] || 0n) + p.centavos;
    });
    return [...listaCategoriaProduto, { key: "Combos", label: "Combos", color: "#6366f1" }, { key: "Sem categoria", label: "Sem categoria", color: "#94a3b8" }]
      .filter((c) => (totals[c.key] || 0) > 0)
      .map((c) => ({ key: c.key, label: c.label, value: emReais(totals[c.key]), color: c.color }));
  }, [pedidosFiltrados]);

  /* -------- Pedidos por Horário (respeita o período) -------- */
  const pedidosPorHorario = useMemo(() => pedidosPorHora(pedidosFiltrados), [pedidosFiltrados]);


  /* -------- Aba Financeiro: faturamento e descontos por dia (respeita o
     período selecionado) -------- */
  const dailyFinance = useMemo(() => {
    const days = eachDayISO(start, end);
    const totals = {};
    pedidosFiltrados.forEach((o) => {
      if (!totals[o.dataEntrega]) totals[o.dataEntrega] = { faturamento: 0n, descontos: 0n };
      totals[o.dataEntrega].faturamento += vendaValida(o) ? BigInt(o.fotografia.totalCentavos) : 0n;
      totals[o.dataEntrega].descontos += vendaValida(o) ? BigInt(o.fotografia.descontoCentavos) : 0n;
    });
    return days.map((iso) => ({
      date: iso,
      faturamento: emReais(totals[iso]?.faturamento || 0n),
      descontos: emReais(totals[iso]?.descontos || 0n),
    }));
  }, [pedidosFiltrados, start, end]);

  // Recebimentos incluem valores parciais e excedentes; estornos são separados.
  const recebido = emReais(resumo.recebidoCentavos);
  const aReceber = emReais(resumo.saldoCentavos);
  const descontosTotais = emReais(resumo.descontoCentavos);

  const financeiroStats = [
    { key: "faturamento-total", label: "Faturamento Total", value: formatBRL(faturamento), icon: DollarSign, color: "#16a34a", bg: "#f0fdf4" },
    { key: "recebido", label: "Recebido bruto", value: formatBRL(recebido), icon: Wallet, color: "#7c3aed", bg: "#ede9fe" },
    { key: "a-receber", label: "A Receber", value: formatBRL(aReceber), icon: Clock, color: "#dc2626", bg: "#fee2e2" },
    { key: "descontos", label: "Descontos", value: formatBRL(descontosTotais), icon: TrendingDown, color: "#ea580c", bg: "#fff7ed" },
    { key: "estornado", label: "Estornado", value: formatBRL(emReais(resumo.estornadoCentavos)), icon: Wallet, color: "#7c3aed", bg: "#ede9fe" },
    { key: "liquido", label: "Recebido líquido", value: formatBRL(emReais(resumo.liquidoCentavos)), icon: Wallet, color: "#7c3aed", bg: "#ede9fe" },
  ];

  /* -------- Aba Financeiro: faturamento por forma de pagamento (respeita
     o período selecionado) -------- */
  const faturamentoPorFormaPagamento = useMemo(() => {
    const totals = {};
    pedidosFiltrados.forEach((o) => {
      for (const pagamento of o.pagamentos || []) {
        if (pagamento.situacao === "REJEITADO") continue;
        const chave = pagamento.forma.toLowerCase();
        totals[chave] = (totals[chave] || 0n) + BigInt(pagamento.valorCentavos);
      }
    });
    return Object.entries(PAYMENT_METHOD_META)
      .map(([key, meta]) => ({
        key,
        label: meta.label,
        value: emReais(totals[key] || 0n),
        color: meta.color,
      }))
      .filter((d) => d.value > 0);
  }, [pedidosFiltrados]);

  /* -------- Aba Financeiro: status de pagamento — quantidade de pedidos
     em cada status (respeita o período selecionado) -------- */
  const statusPagamentoData = useMemo(() => {
    const counts = { pago: 0, parcial: 0, pendente: 0 };
    pedidosFiltrados.forEach((o) => {
      if (counts[o.statusPagamento] !== undefined) counts[o.statusPagamento] += 1;
    });
    return Object.entries(PAYMENT_STATUS_META).map(([key, meta]) => ({
      key,
      label: meta.label,
      value: counts[key],
      color: meta.color,
    }));
  }, [pedidosFiltrados]);

  /* -------- Aba Operacional: distribuição de status (respeita o período
     selecionado) — reaproveita os buckets do Funil de Pedidos, mostrando
     só os que têm pedidos. -------- */
  const statusDistribution = useMemo(
    () => funnelData.filter((d) => d.value > 0),
    [funnelData]
  );

  /* -------- Aba Operacional: entrega vs retirada (respeita o período
     selecionado) -------- */
  const entregaVsRetiradaData = useMemo(() => {
    let entrega = 0;
    let retirada = 0;
    pedidosFiltrados.forEach((o) => {
      if (o.tipoEntrega === "retirada") retirada += 1;
      else entrega += 1;
    });
    return [
      { key: "entrega", label: "Entrega", value: entrega, color: "#f97316" },
      { key: "retirada", label: "Retirada", value: retirada, color: "#10b981" },
    ].filter((d) => d.value > 0);
  }, [pedidosFiltrados]);


  /* -------- Histórico Comparativo por Categoria (Mensal) — usa todos os
     pedidos (não só o período selecionado), sempre os últimos 6 meses,
     igual à lógica de "Pedidos por Dia da Semana" na Visão Geral -------- */
  const historicoCategoriaMensal = useMemo(() => {
    const monthsCount = 6;
    const today = fromISO(todayISO());
    const monthKeys = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
    }

    const monthLabel = (key) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
      return label.replace(".", "");
    };

    const totals = {};
    monthKeys.forEach((k) => (totals[k] = { Bolos: 0n, Doces: 0n, Salgados: 0n, Combos: 0n, Outros: 0n }));

    const bucketFor = (categoria) =>
      categoria === "Bolos" || categoria === "Doces" || categoria === "Salgados" || categoria === "Combos"
        ? categoria
        : "Outros";

    pedidos.forEach((pedido) => {
      if (!pedido.dataEntrega) return;
      const d = fromISO(pedido.dataEntrega);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      if (!totals[key]) return;

      for (const item of itensVendidos(pedido)) totals[key][bucketFor(item.categoria)] += item.centavos;
    });

    const months = monthKeys.map((key) => ({ key, label: monthLabel(key) }));
    const seriesMeta = [
      { key: "Bolos", label: "Bolos", color: "#f59e0b" },
      { key: "Doces", label: "Doces", color: "#ec4899" },
      { key: "Salgados", label: "Salgados", color: "#f97316" },
      { key: "Combos", label: "Combos", color: "#6366f1" },
      { key: "Outros", label: "Outros", color: "#22c55e" },
    ];
    const series = seriesMeta.map((s) => ({
      ...s,
      values: monthKeys.map((key) => emReais(totals[key][s.key])),
    }));

    return { months, series };
  }, [pedidos]);

  /* -------- Aba Clientes: agrega pedidos por cliente (respeita o
     período). O total persistido já reflete o desconto de cada pedido
     no faturamento por cliente. -------- */
  const estatisticasCliente = useMemo(() => {
    const map = new Map();
    pedidosFiltrados.forEach((o) => {
      if (!vendaValida(o)) return;
      const key = o.cliente?.id ?? `sem-cliente-${o.cliente?.nome || "desconhecido"}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nome: o.cliente?.nome || "Cliente não identificado",
          pedidos: 0,
          revenue: 0n,
        });
      }
      const entry = map.get(key);
      entry.pedidos += 1;
      entry.revenue += BigInt(o.fotografia.totalCentavos);
    });
    return Array.from(map.values()).map((item) => ({ ...item, revenue: emReais(item.revenue) }));
  }, [pedidosFiltrados]);

  /* -------- Quantidade de pedidos por cliente considerando todos os
     pedidos com data de entrega até o FIM do período selecionado (não só
     os pedidos dentro do intervalo [start, end], mas também não pedidos
     depois de "end"). Isso é o que permite que um cliente vire
     "Recorrente" exatamente a partir do dia do 2º pedido em diante — sem
     isso, um pedido futuro em relação ao período visualizado "vazaria"
     para trás e faria o cliente parecer recorrente antes mesmo de ter
     feito o 2º pedido. -------- */
  const contagemPedidosClienteAteFim = useMemo(() => {
    const map = new Map();
    pedidos.forEach((o) => {
      if (!vendaValida(o)) return;
      if (!o.dataEntrega) return;
      const d = fromISO(o.dataEntrega);
      if (Number.isNaN(d.getTime()) || d > end) return;
      const key = o.cliente?.id ?? `sem-cliente-${o.cliente?.nome || "desconhecido"}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [pedidos, end]);

  const rankingClientes = useMemo(
    () => [...estatisticasCliente].sort((a, b) => b.revenue - a.revenue),
    [estatisticasCliente]
  );

  const topClientesFaturamento = useMemo(
    () =>
      rankingClientes
        .slice(0, 10)
        .map((c) => ({ label: c.nome, value: c.revenue })),
    [rankingClientes]
  );

  /* -------- Clientes Recorrentes vs Único Pedido: a classificação usa o
     total de pedidos do cliente até o fim do período selecionado
     (contagemPedidosClienteAteFim) — assim, olhando para uma semana passada, o
     cliente só conta como recorrente se já tivesse feito o 2º pedido até
     aquele momento; um pedido feito depois não reescreve o passado. -------- */
  const clientesRecorrentesData = useMemo(() => {
    let recorrentes = 0;
    let unico = 0;
    estatisticasCliente.forEach((c) => {
      const totalPedidos = contagemPedidosClienteAteFim.get(c.id) || c.pedidos;
      if (totalPedidos > 1) recorrentes += 1;
      else unico += 1;
    });
    return [
      { key: "recorrentes", label: "Recorrentes", value: recorrentes, color: "#22c55e" },
      { key: "unico", label: "Único Pedido", value: unico, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [estatisticasCliente, contagemPedidosClienteAteFim]);


  /* -------- Ranking de Clientes: pode ser ordenado por faturamento ou
     por quantidade de pedidos (respeita o período selecionado, igual ao
     restante da aba). -------- */
  const [ordenacaoRankingClientes, setOrdenacaoRankingClientes] = useState("faturamento"); // "faturamento" | "pedidos"

  const rankingClientesTable = useMemo(() => {
    const list = [...estatisticasCliente];
    if (ordenacaoRankingClientes === "pedidos") {
      list.sort((a, b) => b.pedidos - a.pedidos || b.revenue - a.revenue);
    } else {
      list.sort((a, b) => b.revenue - a.revenue || b.pedidos - a.pedidos);
    }
    return list;
  }, [estatisticasCliente, ordenacaoRankingClientes]);

  /* -------- busca por gráfico específico -------- */
  const q = busca.trim().toLowerCase();
  const showsChart = (title) => !q || title.toLowerCase().includes(q);

  const periodLabel = `${toBRDate(toISO(start))} – ${toBRDate(toISO(end))}`;

  if (carregando || tentandoNovamente || erro) return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Relatórios</h1>
      <div className="mt-6 rounded-xl border bg-white p-4" role={erro && !tentandoNovamente ? "alert" : "status"}>
        {erro && !tentandoNovamente ? <>
          Não foi possível carregar os dados. {erro}
          <button className="ml-3 text-blue-600" onClick={async () => {
            setTentandoNovamente(true);
            try { await recarregar(); } finally { setTentandoNovamente(false); }
          }}>Tentar novamente</button>
        </> : "Carregando relatórios…"}
      </div>
    </main>
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <ResumoFinanceiroPedidos resumoFornecido={resumo} />
      {pedidos.some((pedido) => !pedido.fotografia && !pedido.dataEntrega) && <p className="mb-5 text-sm text-amber-700">{pedidos.filter((pedido) => !pedido.fotografia && !pedido.dataEntrega).length} registros legados sem agendamento reconciliado não compõem os cálculos por período.</p>}
      {/* Título + controles */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios</h1>
          <p className="mt-1 text-slate-500">
            {totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""} no período selecionado
            <span className="text-slate-300"> • </span>
            <span className="text-slate-400">{periodLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                preset === "custom"
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              aria-label="Selecionar período personalizado"
              title="Período personalizado"
            >
              <Calendar size={16} />
            </button>

            {showCalendar && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                  <div className="mb-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">De</label>
                      <input
                        type="date"
                        lang="pt-BR"
                        value={customRange.start}
                        onChange={(e) => setCustomRange((p) => ({ ...p, start: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Até</label>
                      <input
                        type="date"
                        lang="pt-BR"
                        value={customRange.end}
                        onChange={(e) => setCustomRange((p) => ({ ...p, end: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (customRange.start && customRange.end && customRange.start <= customRange.end) {
                        setIntervaloAplicado({ ...customRange });
                        setPreset("custom");
                        setShowCalendar(false);
                      }
                    }}
                    disabled={!customRange.start || !customRange.end || customRange.start > customRange.end}
                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                </div>
              </>
            )}
          </div>

          {rangePresets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                preset === p.key
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}

          <span className="mx-1 h-6 w-px bg-slate-200" />

          <button
            onClick={() => exportarPedidosCSV(pedidosFiltrados)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Download size={15} /> CSV
          </button>
          <button
            onClick={() => exportarPedidosCSV(pedidosFiltrados)}
            title="Gera um .csv pronto para importar no Google Sheets"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FileSpreadsheet size={15} /> Sheets
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {/* Abas + busca */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <nav className="flex flex-wrap items-center gap-6">
          {tabs.map(({ key, label, icon: Icon, clickable }) => {
            const isActive = key === tab;
            return (
              <button
                key={key}
                onClick={() => clickable && setTab(key)}
                title={!clickable ? "Em breve" : undefined}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive ? "font-semibold text-blue-600" : "text-slate-500 hover:text-slate-700"
                } ${!clickable ? "cursor-default opacity-50 hover:text-slate-500" : ""}`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar gráfico específico..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {tab === "visao-geral" ? (
        <>
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <StatCard key={s.key} {...s} />
            ))}
          </div>

          {showsChart("Faturamento por Dia") && (
            <div className="mb-6">
              <ChartCard title="Faturamento por Dia">
                <RevenueLineChart data={dailyRevenue} />
              </ChartCard>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showsChart("Pedidos por Dia da Semana") && (
              <ChartCard
                title="Pedidos por Dia da Semana"
                subtitle="Com base em todos os pedidos já cadastrados"
              >
                <WeekdayBarChart data={pedidosPorDiaSemana} />
              </ChartCard>
            )}

            {showsChart("Funil de Pedidos") && (
              <ChartCard title="Funil de Pedidos">
                <StatusFunnelChart data={funnelData} />
              </ChartCard>
            )}
          </div>

          {!showsChart("Faturamento por Dia") &&
            !showsChart("Pedidos por Dia da Semana") &&
            !showsChart("Funil de Pedidos") && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                <BarChart3 size={36} className="mb-3 text-slate-300" strokeWidth={1.5} />
                <p className="text-slate-400">Nenhum gráfico encontrado para "{busca}"</p>
              </div>
            )}
        </>
      ) : tab === "vendas" ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showsChart("Top Produtos por Faturamento") && (
              <ChartCard title="Top Produtos por Faturamento">
                <HorizontalBarList
                  data={topProdutosFaturamento}
                  color="#f59e0b"
                  formatValue={formatBRL}
                  emptyLabel="Nenhuma venda no período selecionado"
                />
              </ChartCard>
            )}

            {showsChart("Top Produtos por Quantidade") && (
              <ChartCard title="Top Produtos por Quantidade">
                <HorizontalBarList
                  data={topProdutosQuantidade}
                  color="#f97316"
                  formatValue={(v) => `${v} un.`}
                  emptyLabel="Nenhuma venda no período selecionado"
                />
              </ChartCard>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showsChart("Vendas por Categoria") && (
              <ChartCard title="Vendas por Categoria">
                <GraficoDonutCategoria data={vendasPorCategoria} />
              </ChartCard>
            )}

            {showsChart("Pedidos por Horário") && (
              <ChartCard title="Pedidos por Horário">
                <HourlyBarChart data={pedidosPorHorario} />
              </ChartCard>
            )}
          </div>



          {showsChart("Histórico Comparativo por Categoria (Mensal)") && (
            <div className="mt-6">
              <ChartCard
                title="Histórico Comparativo por Categoria (Mensal)"
                subtitle="Com base em todos os pedidos já cadastrados"
              >
                <GraficoHistoricoCategoria
                  months={historicoCategoriaMensal.months}
                  series={historicoCategoriaMensal.series}
                />
              </ChartCard>
            </div>
          )}

          {showsChart("Detalhamento por Produto") && (
            <div className="mt-6">
              <ChartCard title="Detalhamento por Produto">
                {detalhamentoProdutos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Nenhuma venda no período selecionado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 pb-3 text-sm text-slate-400">
                        <span>Produto</span>
                        <span>Categoria</span>
                        <span className="text-right">Qtd. Vendida</span>
                        <span className="text-right">Faturamento</span>
                        <span className="text-right">Ticket Médio</span>
                      </div>
                      {detalhamentoProdutos.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 py-3 text-sm ${
                            idx !== detalhamentoProdutos.length - 1
                              ? "border-b border-slate-100"
                              : ""
                          }`}
                        >
                          <span className="font-medium text-slate-800">{p.nome}</span>
                          <span className="text-slate-500">{p.categoria}</span>
                          <span className="text-right text-slate-600">{p.quantidade}</span>
                          <span className="text-right font-semibold text-slate-900">
                            {formatBRL(p.revenue)}
                          </span>
                          <span className="text-right text-slate-500">
                            {formatBRL(p.quantidade > 0 ? p.revenue / p.quantidade : 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>
          )}

          {!showsChart("Top Produtos por Faturamento") &&
            !showsChart("Top Produtos por Quantidade") &&
            !showsChart("Vendas por Categoria") &&
            !showsChart("Pedidos por Horário") &&
            !showsChart("Histórico Comparativo por Categoria (Mensal)") &&
            !showsChart("Detalhamento por Produto") && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                <BarChart3 size={36} className="mb-3 text-slate-300" strokeWidth={1.5} />
                <p className="text-slate-400">Nenhum gráfico encontrado para "{busca}"</p>
              </div>
            )}
        </>
      ) : tab === "clientes" ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showsChart("Top 10 Clientes por Faturamento") && (
              <ChartCard title="Top 10 Clientes por Faturamento">
                <HorizontalBarList
                  data={topClientesFaturamento}
                  color="#f59e0b"
                  formatValue={formatBRL}
                  emptyLabel="Nenhum cliente no período selecionado"
                />
              </ChartCard>
            )}

            {showsChart("Clientes Recorrentes vs Único Pedido") && (
              <ChartCard title="Clientes Recorrentes vs Único Pedido">
                <GraficoDonutCategoria
                  data={clientesRecorrentesData}
                  formatValue={(v) => String(v)}
                  emptyLabel="Nenhum cliente no período selecionado"
                />
              </ChartCard>
            )}
          </div>



          {showsChart("Ranking de Clientes") && (
            <div className="mt-6">
              <ChartCard title="Ranking de Clientes">
                <div className="mb-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrdenacaoRankingClientes("faturamento")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      ordenacaoRankingClientes === "faturamento"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    Maior Faturamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdenacaoRankingClientes("pedidos")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      ordenacaoRankingClientes === "pedidos"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    Mais Pedidos
                  </button>
                </div>

                {rankingClientesTable.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Nenhum cliente no período selecionado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      <div className="grid grid-cols-[0.4fr_2fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 pb-3 text-sm text-slate-400">
                        <span>#</span>
                        <span>Cliente</span>
                        <span className="text-right">Pedidos</span>
                        <span className="text-right">Faturamento Total</span>
                        <span className="text-right">Ticket Médio</span>
                      </div>
                      {rankingClientesTable.map((c, idx) => (
                        <div
                          key={c.id}
                          className={`grid grid-cols-[0.4fr_2fr_1fr_1fr_1fr] items-center gap-4 py-3 text-sm ${
                            idx !== rankingClientesTable.length - 1
                              ? "border-b border-slate-100"
                              : ""
                          }`}
                        >
                          <span className="text-slate-400">{idx + 1}</span>
                          <span className="font-medium text-slate-800">{c.nome}</span>
                          <span className="text-right text-slate-600">{c.pedidos}</span>
                          <span className="text-right font-semibold text-slate-900">
                            {formatBRL(c.revenue)}
                          </span>
                          <span className="text-right text-slate-500">
                            {formatBRL(c.pedidos > 0 ? c.revenue / c.pedidos : 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>
          )}

          {!showsChart("Top 10 Clientes por Faturamento") &&
            !showsChart("Clientes Recorrentes vs Único Pedido") &&
            !showsChart("Ranking de Clientes") && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                <BarChart3 size={36} className="mb-3 text-slate-300" strokeWidth={1.5} />
                <p className="text-slate-400">Nenhum gráfico encontrado para "{busca}"</p>
              </div>
            )}
        </>
      ) : tab === "financeiro" ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {financeiroStats.map((s) => (
              <StatCard key={s.key} {...s} />
            ))}
          </div>

          {showsChart("Faturamento e Descontos por Dia") && (
            <div className="mb-6">
              <ChartCard title="Faturamento e Descontos por Dia">
                <RevenueDiscountLineChart data={dailyFinance} />
              </ChartCard>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showsChart("Recebimentos por Forma de Pagamento") && (
              <ChartCard title="Recebimentos por Forma de Pagamento" subtitle="Recebimentos brutos, antes dos estornos; período do agendamento">
                <GraficoDonutCategoria
                  data={faturamentoPorFormaPagamento}
                  emptyLabel="Nenhum pagamento no período selecionado"
                />
              </ChartCard>
            )}

            {showsChart("Status de Pagamento") && (
              <ChartCard title="Status de Pagamento">
                <StatusBarChart
                  data={statusPagamentoData}
                  emptyLabel="Nenhum pedido no período selecionado"
                />
              </ChartCard>
            )}
          </div>

          {!showsChart("Faturamento e Descontos por Dia") &&
            !showsChart("Recebimentos por Forma de Pagamento") &&
            !showsChart("Status de Pagamento") && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                <BarChart3 size={36} className="mb-3 text-slate-300" strokeWidth={1.5} />
                <p className="text-slate-400">Nenhum gráfico encontrado para "{busca}"</p>
              </div>
            )}
        </>
      ) : tab === "operacional" ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showsChart("Distribuição de Status") && (
              <ChartCard title="Distribuição de Status">
                <StatusBarChart
                  data={statusDistribution}
                  emptyLabel="Nenhum pedido no período selecionado"
                />
              </ChartCard>
            )}

            {showsChart("Entrega vs Retirada") && (
              <ChartCard title="Entrega vs Retirada">
                <GraficoDonutCategoria
                  data={entregaVsRetiradaData}
                  formatValue={(v) => String(v)}
                  emptyLabel="Nenhum pedido no período selecionado"
                />
              </ChartCard>
            )}
          </div>

          {showsChart("Pedidos por Horário de Entrega") && (
            <div className="mt-6">
              <ChartCard title="Pedidos por Horário de Entrega">
                <HourlyBarChart data={pedidosPorHorario} />
              </ChartCard>
            </div>
          )}



          {!showsChart("Distribuição de Status") &&
            !showsChart("Entrega vs Retirada") &&
            !showsChart("Pedidos por Horário de Entrega") &&
            (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                <BarChart3 size={36} className="mb-3 text-slate-300" strokeWidth={1.5} />
                <p className="text-slate-400">Nenhum gráfico encontrado para "{busca}"</p>
              </div>
            )}
        </>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <BarChart3 size={40} className="mb-3 text-slate-300" strokeWidth={1.5} />
          <p className="text-slate-400">Esta aba ainda está em construção</p>
        </div>
      )}
    </main>
  );
}
