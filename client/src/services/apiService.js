import { urlDaApi } from "../config/api.js";

export async function requisitarApi(
  caminho,
  metodo = "GET",
  corpo = undefined,
  tokenInterno,
) {
  if (typeof tokenInterno !== "string" || tokenInterno.trim() === "") {
    throw new Error("Autenticação obrigatória");
  }

  let corpoBody = undefined;
  const cabecalho = {
    Authorization: `Bearer ${tokenInterno}`,
  };

  if (corpo !== undefined) {
    cabecalho["Content-Type"] = "application/json";
    corpoBody = JSON.stringify(corpo);
  }

  const resposta = await fetch(urlDaApi + caminho, {
    method: metodo,
    headers: cabecalho,
    body: corpoBody,
  });

  if (resposta.status === 204) {
    return null;
  }
  const conteudo = await resposta.json();

  if (!resposta.ok) {
    const erro = new Error(conteudo?.mensagem || "Erro ao carregar api");
    erro.status = resposta.status;
    throw erro;
  }

  return conteudo;
}
