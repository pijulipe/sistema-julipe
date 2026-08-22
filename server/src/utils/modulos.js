const pedidos = { chave: "PEDIDOS", nome: "Pedidos" };
const producao = { chave: "PRODUCAO", nome: "Produção" };
const produto = { chave: "PRODUTO", nome: "Produto" };
const combos = { chave: "COMBOS", nome: "Combos" };
const relatorio = { chave: "RELATORIO", nome: "Relatório" };
const clientes = { chave: "CLIENTES", nome: "Clientes" };
const estoque = { chave: "ESTOQUE", nome: "Estoque" };
const expedicao = { chave: "EXPEDICAO", nome: "Expedição" };
const funcionario = { chave: "FUNCIONARIOS", nome: "Funcionários" };

const catalogoModulos = [
  pedidos,
  producao,
  produto,
  combos,
  relatorio,
  clientes,
  estoque,
  expedicao,
  funcionario,
];

catalogoModulos.forEach((modulo) => {
  Object.freeze(modulo);
});
Object.freeze(catalogoModulos);

const chavesModulos = catalogoModulos.map((modulo) => {
  return modulo.chave;
});
Object.freeze(chavesModulos);

export { catalogoModulos, chavesModulos };

export function moduloValido(modulo) {
  return chavesModulos.includes(modulo);
}
