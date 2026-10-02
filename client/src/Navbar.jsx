import React, { useEffect, useRef, useState } from "react";
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
  ChevronDown,
} from "lucide-react";

/* A logo fica em public/julipe-logo.png (PNG com fundo transparente). */
const LOGO = "/julipe-logo-branca.png";

const inicio = { key: "home", label: "Início", icon: LayoutGrid };

// As chaves dos itens são as mesmas telas usadas em App.jsx (podeAbrir / view).
const grupos = [
  {
    key: "atendimento",
    label: "Atendimento",
    icon: ClipboardList,
    itens: [
      { key: "pedidos", label: "Pedidos", icon: ClipboardList },
      { key: "clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    key: "catalogo",
    label: "Produtos",
    icon: Package,
    itens: [
      { key: "produto", label: "Produto", icon: Package },
      { key: "combos", label: "Combos", icon: Layers },
    ],
  },
  {
    key: "logistica",
    label: "Logística",
    icon: Truck,
    itens: [
      //{ key: "estoque", label: "Estoque", icon: Boxes },
      { key: "producao", label: "Produção", icon: Factory },
      { key: "expedicao", label: "Expedição", icon: Truck },
    ],
  },
  {
    key: "administracao",
    label: "Administração",
    icon: BarChart2,
    itens: [
      { key: "relatorio", label: "Relatórios", icon: BarChart2 },
      { key: "funcionarios", label: "Funcionários", icon: UserCog },
    ],
  },
];

export default function Navbar({
  ativo,
  onNavigate,
  onSair = () => {},
  saindo = false,
  podeAbrir = () => true,
}) {
  // Menu recolhível: usado abaixo de lg (1024px).
  const [menuAberto, setMenuAberto] = useState(false);
  // Dropdown aberto na barra (telas grandes): chave do grupo ou null.
  const [grupoAberto, setGrupoAberto] = useState(null);
  const barraRef = useRef(null);

  // Só aparecem os itens que o usuário pode abrir; grupos sem itens somem.
  const gruposVisiveis = grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter(({ key }) => podeAbrir(key)) }))
    .filter((grupo) => grupo.itens.length > 0);

  // Fecha o dropdown ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!grupoAberto) return undefined;
    const aoClicarFora = (evento) => {
      if (!barraRef.current?.contains(evento.target)) setGrupoAberto(null);
    };
    const aoTeclar = (evento) => {
      if (evento.key === "Escape") setGrupoAberto(null);
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [grupoAberto]);

  const navegar = (key) => {
    onNavigate(key);
    setMenuAberto(false);
    setGrupoAberto(null);
  };

  const classeItem = (selecionado, aberto = false) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:gap-1.5 lg:px-2.5 xl:gap-2 xl:px-3 ${
      selecionado
        ? "bg-blue-600 text-white"
        : aberto
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  const botaoInicio = () => (
    <button type="button" onClick={() => navegar(inicio.key)} className={classeItem(ativo === inicio.key)}>
      <inicio.icon size={16} strokeWidth={2} />
      {inicio.label}
    </button>
  );

  return (
    <header className="bg-[#0f172a] px-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2">
        <button
          type="button"
          onClick={() => navegar(inicio.key)}
          aria-label="Ir para o início"
          className="mr-2 flex shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <img src={LOGO} alt="Julipe — Fabricando sabores" className="h-9 w-auto" />
        </button>

        {/* Navegação em linha — telas grandes. Sem overflow para não cortar os dropdowns. */}
        <nav
          ref={barraRef}
          aria-label="Principal"
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
        >
          {podeAbrir(inicio.key) && botaoInicio()}

          {gruposVisiveis.map(({ key, label, icon: Icone, itens }) => {
            const aberto = grupoAberto === key;
            const contemAtivo = itens.some((item) => item.key === ativo);
            return (
              <div key={key} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={aberto}
                  onClick={() => setGrupoAberto(aberto ? null : key)}
                  className={classeItem(contemAtivo, aberto)}
                >
                  <Icone size={16} strokeWidth={2} />
                  {label}
                  <ChevronDown
                    size={14}
                    strokeWidth={2.25}
                    className={`transition-transform ${aberto ? "rotate-180" : ""}`}
                  />
                </button>

                {aberto && (
                  <div
                    role="menu"
                    aria-label={label}
                    className="absolute left-0 top-full z-40 mt-2 min-w-48 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5"
                  >
                    {itens.map(({ key: chave, label: rotulo, icon: IconeItem }) => (
                      <button
                        key={chave}
                        type="button"
                        role="menuitem"
                        onClick={() => navegar(chave)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          chave === ativo
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <IconeItem size={16} strokeWidth={2} className={chave === ativo ? "text-blue-600" : "text-slate-500"} />
                        {rotulo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            type="button"
            onClick={onSair}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saindo}
            aria-label="Sair"
          >
            <LogOut size={16} strokeWidth={2} />
            <span className="hidden sm:inline">{saindo ? "Saindo..." : "Sair"}</span>
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

      {/* Menu recolhível — telas pequenas e médias: os grupos aparecem já abertos. */}
      {menuAberto && (
        <nav
          id="menu-mobile"
          aria-label="Principal"
          className="mx-auto max-w-7xl space-y-3 border-t border-white/10 pb-3 pt-2 lg:hidden"
        >
          {podeAbrir(inicio.key) && (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
              {botaoInicio()}
            </div>
          )}
          {gruposVisiveis.map(({ key, label, itens }) => (
            <div key={key}>
              <p className="px-3 pb-1 text-xs font-semibold text-slate-500">{label}</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                {itens.map(({ key: chave, label: rotulo, icon: IconeItem }) => (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => navegar(chave)}
                    className={classeItem(chave === ativo)}
                  >
                    <IconeItem size={16} strokeWidth={2} />
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
