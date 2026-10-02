/**
 * Estilo único dos botões secundários do sistema.
 *
 * Repouso:      fundo branco, borda suave, texto cinza.
 * Selecionado:  fundo, borda e texto na mesma cor (tom "azul" ou "verde").
 *
 * Uso:
 *   <button className={botaoSecundario()}>Cancelar</button>
 *   <button className={botaoSecundario({ selecionado: modo === "existente", tom: "azul" })}>Cliente Existente</button>
 *   <button className={botaoSecundario({ selecionado: modo === "novo", tom: "verde" })}>Novo Cliente</button>
 *   <button className={`${botaoSecundario({ tamanho: "lg" })} flex-1`}>Cancelar</button>
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const tamanhos = {
  sm: "px-3 py-2",
  md: "px-4 py-2.5",
  lg: "px-4 py-3",
  icone: "h-9 w-9",
};

const estados = {
  neutro: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800",
  azul: "border-blue-500 bg-blue-50 text-blue-600",
  verde: "border-emerald-500 bg-emerald-50 text-emerald-700",
};

export function botaoSecundario({ selecionado = false, tom = "azul", tamanho = "md" } = {}) {
  return `${base} ${tamanhos[tamanho] || tamanhos.md} ${selecionado ? estados[tom] || estados.azul : estados.neutro}`;
}
