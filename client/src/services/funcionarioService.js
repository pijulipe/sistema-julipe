import { requisitarApi } from "./apiService.js";

export async function criarFuncionario(dados, tokenInterno) {
    const conteudo = await requisitarApi("/api/funcionarios", "POST", dados, tokenInterno);
    return conteudo.dados;
}

export async function listarFuncionarios(
    tokenInterno,
    { busca = "", perfilAcesso, ativo, pagina = 1, limite = 20 } = {}) {

    const buscaTratada = busca.trim();
    const parametros = { pagina, limite };
    if (buscaTratada !== "") {
        parametros.busca = buscaTratada;
    }
    if (perfilAcesso) {
        parametros.perfilAcesso = perfilAcesso;
    }

    if (ativo !== undefined) { parametros.ativo = ativo; }

    const urlParams = new URLSearchParams(parametros);


    const caminho = `/api/funcionarios?` + urlParams.toString();

    const conteudo = await requisitarApi(caminho, "GET", undefined, tokenInterno);

    return conteudo;
}

export async function buscarFuncionarioPorId(idUsuario, tokenInterno) {

    const caminho = `/api/funcionarios/` + idUsuario

    const conteudo = await requisitarApi(caminho, "GET", undefined, tokenInterno)

    return conteudo.dados;
}

export async function substituirPermissoes(idUsuario, modulos, tokenInterno) {

    const caminho = `/api/funcionarios/` + idUsuario + `/permissoes`

    const conteudo = await requisitarApi(caminho, "PUT", { modulos }, tokenInterno)

    return conteudo.dados;
}

export async function alterarPerfil(idUsuario, perfilAcesso, tokenInterno) {

    const caminho = `/api/funcionarios/` + idUsuario + `/perfil`

    const conteudo = await requisitarApi(caminho, "PATCH", { perfilAcesso }, tokenInterno)

    return conteudo.dados;

}