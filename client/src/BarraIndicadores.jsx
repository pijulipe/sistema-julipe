import React from "react";

/**
 * Barra de indicadores com ícone (ex.: Pedidos Hoje, Em Produção, Prontos).
 * Use em qualquer tela que precise do mesmo display.
 *
 * itens: [{ label, value, icon: ComponenteLucide, color: "#2563eb" }]
 */
export default function BarraIndicadores({ itens, className = "mb-6" }) {
  return (
    <div className={`rounded-2xl bg-white px-5 py-4 shadow-sm ${className}`}>
      <ul className="flex flex-wrap items-center gap-x-10 gap-y-4">
        {itens.map(({ label, value, icon: Icone, color }) => (
          <li key={label} className="flex items-center gap-3">
            <Icone size={20} strokeWidth={2} style={{ color }} aria-hidden="true" />
            <div>
              <div className="text-lg font-bold leading-tight text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
