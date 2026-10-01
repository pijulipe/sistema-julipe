import React, { useState } from "react";
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
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { key: "home", label: "Início", icon: LayoutGrid, clickable: true },
  { key: "pedidos", label: "Pedidos", icon: ClipboardList, clickable: true },
  { key: "producao", label: "Produção", icon: Factory, clickable: true },
  { key: "produto", label: "Produto", icon: Package, clickable: true },
  { key: "combos", label: "Combos", icon: Layers, clickable: true },
  { key: "relatorio", label: "Relatório", icon: BarChart2, clickable: true },
  { key: "clientes", label: "Clientes", icon: Users, clickable: true },
  //{ key: "estoque", label: "Estoque", icon: Boxes, clickable: true },
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
  podeAbrir = () => true,
}) {
  // Menu recolhível: usado abaixo de lg (1024px). Entre lg e xl os itens ficam compactos.
  const [menuAberto, setMenuAberto] = useState(false);
  const itens = navItems.filter(({ key }) => podeAbrir(key));

  const navegar = (key, clickable) => {
    if (!clickable) return;
    onNavigate(key);
    setMenuAberto(false);
  };

  const classeItem = (key, clickable) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:gap-1.5 lg:px-2 lg:py-2 xl:gap-2 xl:px-3 ${
      key === ativo
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    } ${!clickable ? "cursor-default opacity-70" : ""}`;

  return (
    <header className="bg-[#0f172a] px-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-1">
        <div className="mr-2 flex shrink-0 items-center gap-2 pr-2 xl:mr-4 xl:pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-base">🎂</span>
          </div>
          <span className="text-base font-semibold text-white">Julipe</span>
        </div>

        {/* Navegação em linha — telas grandes */}
        <nav className="hidden min-w-0 items-center gap-0.5 overflow-x-auto lg:flex xl:gap-1">
          {itens.map(({ key, label, icon: Icon, clickable }) => (
            <button
              key={key}
              onClick={() => navegar(key, clickable)}
              className={classeItem(key, clickable)}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onSair}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saindo}
            aria-label="Sair"
          >
            <LogOut size={16} strokeWidth={2} />
            <span className="hidden sm:inline lg:hidden xl:inline">{saindo ? "Saindo..." : "Sair"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="menu-mobile"
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu recolhível — telas pequenas e médias */}
      {menuAberto && (
        <nav
          id="menu-mobile"
          className="mx-auto max-w-7xl border-t border-white/10 pb-3 pt-2 lg:hidden"
        >
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
            {itens.map(({ key, label, icon: Icon, clickable }) => (
              <button
                key={key}
                onClick={() => navegar(key, clickable)}
                className={classeItem(key, clickable)}
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
