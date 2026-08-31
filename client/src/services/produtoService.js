import { supabase } from "../config/supabase.js";
import { requisitarApi } from "./apiService.js";

const BALDE = "imagens-produtos";

export async function listarProdutos(tokenInterno, filtros = {}) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== "" && valor !== undefined && valor !== null) parametros.set(chave, valor);
  }
  return requisitarApi(`/api/produtos?${parametros}`, "GET", undefined, tokenInterno);
}

export async function criarProduto(dados, tokenInterno) {
  return (await requisitarApi("/api/produtos", "POST", dados, tokenInterno)).dados;
}

export async function atualizarProduto(idProduto, dados, tokenInterno) {
  return (await requisitarApi(`/api/produtos/${idProduto}`, "PATCH", dados, tokenInterno)).dados;
}

export async function excluirProduto(idProduto, tokenInterno) {
  return requisitarApi(`/api/produtos/${idProduto}`, "DELETE", undefined, tokenInterno);
}

export async function enviarImagemProduto(arquivo, tokenInterno) {
  const autorizacao = await requisitarApi(
    "/api/produtos/imagens/autorizacoes",
    "POST",
    { nomeArquivo: arquivo.name, tipoMime: arquivo.type, tamanho: arquivo.size },
    tokenInterno,
  );
  const { caminhoImagem, tokenUpload } = autorizacao.dados;
  const { error } = await supabase.storage.from(BALDE)
    .uploadToSignedUrl(caminhoImagem, tokenUpload, arquivo, {
      contentType: arquivo.type,
      upsert: false,
    });
  if (error) throw new Error("Não foi possível enviar a foto do produto.");
  return caminhoImagem;
}
