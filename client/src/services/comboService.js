import { requisitarApi } from "./apiService.js";

export async function listarCombos(tokenInterno, filtros = {}) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== "" && valor !== undefined && valor !== null) parametros.set(chave, valor);
  }
  return requisitarApi(`/api/combos?${parametros}`, "GET", undefined, tokenInterno);
}

export async function criarCombo(dados, tokenInterno) {
  return (await requisitarApi("/api/combos", "POST", dados, tokenInterno)).dados;
}

export async function atualizarCombo(idCombo, dados, tokenInterno) {
  return (await requisitarApi(`/api/combos/${idCombo}`, "PATCH", dados, tokenInterno)).dados;
}

export async function excluirCombo(idCombo, tokenInterno) {
  return requisitarApi(`/api/combos/${idCombo}`, "DELETE", undefined, tokenInterno);
}
