import { requisitarApi } from "./apiService.js";

export async function listarCategoriasProdutos(tokenInterno) {
  return (await requisitarApi("/api/categorias-produtos", "GET", undefined, tokenInterno)).dados;
}
