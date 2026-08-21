import { requisitarApi } from "./apiService.js";

async function listarClientes(
  tokenInterno,
  { busca = "", pagina = 1, limite = 20 } = {},
) {
  let urlParams = {};
  const buscaTratada = busca.trim();
  if (buscaTratada !== "") {
    busca = buscaTratada;
    urlParams = new URLSearchParams({ busca, pagina, limite });
  } else {
    urlParams = new URLSearchParams({ pagina, limite });
  }

  const caminho = `/api/clientes?` + urlParams.toString();

  const conteudo = await requisitarApi(caminho, "GET", undefined, tokenInterno);

  return conteudo;
}

async function criarCliente(dados, tokenInterno) {
  const conteudo = await requisitarApi(
    "/api/clientes",
    "POST",
    dados,
    tokenInterno,
  );
  return conteudo.dados;
}

async function atualizarCliente(idCliente, dados, tokenInterno) {
  const caminho = "/api/clientes/" + idCliente;

  const conteudo = await requisitarApi(caminho, "PATCH", dados, tokenInterno);

  return conteudo.dados;
}

async function excluirCliente(idCliente, tokenInterno) {
  const caminho = "/api/clientes/" + idCliente;

  const conteudo = await requisitarApi(
    caminho,
    "DELETE",
    undefined,
    tokenInterno,
  );

  return conteudo;
}

export { listarClientes, criarCliente, atualizarCliente, excluirCliente };
