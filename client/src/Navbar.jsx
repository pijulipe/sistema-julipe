import React from "react";
import {
  LayoutGrid,
  ClipboardList,
  Factory,
  Package,
  Layers,
  BarChart2,
  Users,
  Boxes,
  Truck,
  UserCog,
  LogOut,
} from "lucide-react";

const navItems = [
  { key: "home", label: "Início", icon: LayoutGrid, clickable: true },
  { key: "pedidos", label: "Pedidos", icon: ClipboardList, clickable: true },
  { key: "producao", label: "Produção", icon: Factory, clickable: true },
  { key: "produto", label: "Produto", icon: Package, clickable: true },
  { key: "combos", label: "Combos", icon: Layers, clickable: true },
  { key: "relatorio", label: "Relatório", icon: BarChart2, clickable: true },
  { key: "clientes", label: "Clientes", icon: Users, clickable: true },
  { key: "estoque", label: "Estoque", icon: Boxes, clickable: true },
  { key: "expedicao", label: "Expedição", icon: Truck, clickable: true },
  {
    key: "funcionarios",
    label: "Funcionários",
    icon: UserCog,
    clickable: true,
  },
];

export default function Navbar({
  ativo,
  onNavigate,
  onSair = () => {},
  saindo = false,
}) {
  return (
    <header className="bg-[#0f172a] px-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-1">
        <div className="mr-4 flex items-center gap-2 pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-base">🎂</span>
          </div>
          <span className="text-base font-semibold text-white">Julipe</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ key, label, icon: Icon, clickable }) => {
            const isActive = key === ativo;
            return (
              <button
                key={key}
                onClick={() => clickable && onNavigate(key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                } ${!clickable ? "cursor-default opacity-70" : ""}`}
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onSair}
          className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saindo}
        >
          <LogOut size={16} strokeWidth={2} />
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}
