import { Cake, Candy, Sandwich, CupSoda, Snowflake, PartyPopper } from "lucide-react";

/**
 * defaultUnitsPerPackage: quantas unidades reais uma "unidade de estoque"
 * dessa categoria representa. Ex: salgados são contados em pacotes de 25,
 * então 1 unidade de estoque = 25 salgados de verdade.
 * Pode ser sobrescrito produto a produto no cadastro.
 */
export const categories = [
  {
    key: "Bolos",
    label: "Bolos",
    icon: Cake,
    bg: "#fef3c7",
    color: "#f59e0b",
    defaultUnitsPerPackage: 1,
    allowsImage: true,
  },
  {
    key: "Doces",
    label: "Doces",
    icon: Candy,
    bg: "#fce7f3",
    color: "#db2777",
    defaultUnitsPerPackage: 1,
    allowsImage: true,
  },
  {
    key: "Salgados",
    label: "Salgados",
    icon: Sandwich,
    bg: "#ffedd5",
    color: "#ef4444",
    defaultUnitsPerPackage: 25,
  },
  {
    key: "Bebidas",
    label: "Bebidas",
    icon: CupSoda,
    bg: "#dbeafe",
    color: "#2563eb",
    defaultUnitsPerPackage: 1,
  },
  {
    key: "Congelados",
    label: "Congelados",
    icon: Snowflake,
    bg: "#cffafe",
    color: "#0891b2",
    defaultUnitsPerPackage: 1,
  },
  {
    key: "Festas",
    label: "Festas",
    icon: PartyPopper,
    bg: "#fae8ff",
    color: "#a855f7",
    defaultUnitsPerPackage: 1,
  },
];

export const units = ["Unidade", "Kg", "Litro", "Pacote", "Fatia"];

export function getCategoryMeta(key) {
  return categories.find((c) => c.key === key) || categories[0];
}

/** Só Bolos e Doces aceitam foto do produto (definido em cada categoria). */
export function categorySupportsImage(key) {
  return !!getCategoryMeta(key).allowsImage;
}
