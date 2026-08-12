import { Cake, Candy, Sandwich, CupSoda, Snowflake, PartyPopper } from "lucide-react";

/**
 * unidadesPorPacotePadrao: quantas unidades reais uma "unidade de estoque"
 * dessa categoria representa. Ex: salgados são contados em pacotes de 25,
 * então 1 unidade de estoque = 25 salgados de verdade.
 * Pode ser sobrescrito produto a produto no cadastro.
 */
export const categorias = [
  {
    key: "Bolos",
    label: "Bolos",
    icon: Cake,
    bg: "#fef3c7",
    color: "#f59e0b",
    unidadesPorPacotePadrao: 1,
    permiteImagem: true,
  },
  {
    key: "Doces",
    label: "Doces",
    icon: Candy,
    bg: "#fce7f3",
    color: "#db2777",
    unidadesPorPacotePadrao: 1,
    permiteImagem: true,
  },
  {
    key: "Salgados",
    label: "Salgados",
    icon: Sandwich,
    bg: "#ffedd5",
    color: "#ef4444",
    unidadesPorPacotePadrao: 25,
  },
  {
    key: "Bebidas",
    label: "Bebidas",
    icon: CupSoda,
    bg: "#dbeafe",
    color: "#2563eb",
    unidadesPorPacotePadrao: 1,
  },
  {
    key: "Congelados",
    label: "Congelados",
    icon: Snowflake,
    bg: "#cffafe",
    color: "#0891b2",
    unidadesPorPacotePadrao: 1,
  },
  {
    key: "Festas",
    label: "Festas",
    icon: PartyPopper,
    bg: "#fae8ff",
    color: "#a855f7",
    unidadesPorPacotePadrao: 1,
  },
];

export const unidades = ["Unidade", "Kg", "Litro", "Pacote", "Fatia"];

export function obterCategoriaInfo(key) {
  return categorias.find((c) => c.key === key) || categorias[0];
}

/** Só Bolos e Doces aceitam foto do produto (definido em cada categoria). */
export function categoriaAceitaImagem(key) {
  return !!obterCategoriaInfo(key).permiteImagem;
}
