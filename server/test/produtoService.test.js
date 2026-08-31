import test from "node:test";
import assert from "node:assert/strict";
import { ProdutoService } from "../src/services/produtoService.js";

const categoriaComImagem = {
  idCategoria: "1", nome: "Bolos", unidadesPorPacotePadrao: 1, permiteImagem: true,
};
const categoriaSemImagem = {
  idCategoria: "3", nome: "Salgados", unidadesPorPacotePadrao: 25, permiteImagem: false,
};
const caminho = "temporarios/123e4567-e89b-42d3-a456-426614174000.jpg";

function produto(sobrescritas = {}) {
  return {
    idProduto: "10", nome: "Bolo", descricao: null, precoUnitario: 20,
    unidadeMedida: "Unidade", multiploMinimo: 1, tempoPreparoMinutos: 10,
    caminhoImagem: null, ativo: true, categoria: categoriaComImagem, ...sobrescritas,
  };
}

function criarDependencias({ categoria = categoriaComImagem, atual = produto() } = {}) {
  const chamadas = { atualizacoes: [], removidos: [] };
  const repositorio = {
    criar: async (dados) => produto({ ...dados, categoria }),
    buscarPorId: async () => atual,
    buscarPorCaminhoImagem: async () => null,
    listar: async () => ({ produtos: [atual], total: 21 }),
    atualizar: async (id, dados) => {
      chamadas.atualizacoes.push(dados);
      return produto({ ...atual, ...dados, categoria });
    },
    excluir: async () => true,
  };
  const categorias = { buscarAtivaPorId: async () => categoria };
  const armazenamento = {
    existe: async () => true,
    criarUrlLeitura: async (valor) => valor ? "https://url-temporaria" : null,
    remover: async (valor) => { chamadas.removidos.push(valor); return true; },
    autorizarUpload: async (dados) => dados,
  };
  return { servico: new ProdutoService(repositorio, categorias, armazenamento), repositorio, categorias, chamadas };
}

test("cadastra produto válido e gera URL de leitura", async () => {
  const { servico } = criarDependencias();
  const resultado = await servico.criar({ idCategoria: 1, caminhoImagem: caminho });
  assert.equal(resultado.imagemUrl, "https://url-temporaria");
});

test("rejeita categoria inexistente ou inativa", async () => {
  const { servico, categorias } = criarDependencias();
  categorias.buscarAtivaPorId = async () => null;
  await assert.rejects(() => servico.criar({ idCategoria: 99 }), { status: 422 });
});

test("rejeita imagem em categoria não permitida", async () => {
  const { servico } = criarDependencias({ categoria: categoriaSemImagem });
  await assert.rejects(() => servico.criar({ idCategoria: 3, caminhoImagem: caminho }), { status: 422 });
});

test("rejeita caminho já usado ou ausente no Storage", async () => {
  const { servico, repositorio } = criarDependencias();
  repositorio.buscarPorCaminhoImagem = async () => "11";
  await assert.rejects(() => servico.criar({ idCategoria: 1, caminhoImagem: caminho }), { status: 422 });
});

test("rejeita caminho que não existe no Storage", async () => {
  const { servico } = criarDependencias();
  servico.armazenamentoService.existe = async () => false;
  await assert.rejects(() => servico.criar({ idCategoria: 1, caminhoImagem: caminho }), { status: 422 });
});

test("lista com paginação e filtros repassados", async () => {
  const { servico, repositorio } = criarDependencias();
  let filtrosRecebidos;
  repositorio.listar = async (filtros) => {
    filtrosRecebidos = filtros;
    return { produtos: [produto()], total: 21 };
  };
  const filtros = { busca: "bolo", ativo: true, pagina: 2, limite: 10 };
  const resultado = await servico.listar(filtros);
  assert.deepEqual(filtrosRecebidos, filtros);
  assert.deepEqual(resultado.paginacao, { pagina: 2, limite: 10, total: 21, totalPaginas: 3 });
});

test("consulta inexistente retorna 404", async () => {
  const { servico, repositorio } = criarDependencias();
  repositorio.buscarPorId = async () => null;
  await assert.rejects(() => servico.buscarPorId("99"), { status: 404 });
});

test("atualização parcial ativa e inativa o produto", async () => {
  const { servico, chamadas } = criarDependencias();
  assert.equal((await servico.atualizar("10", { ativo: false })).ativo, false);
  assert.equal((await servico.atualizar("10", { ativo: true })).ativo, true);
  assert.deepEqual(chamadas.atualizacoes.map((dados) => dados.ativo), [false, true]);
});

test("troca de categoria remove associação e arquivo antigo", async () => {
  const atual = produto({ caminhoImagem: caminho });
  const { servico, chamadas } = criarDependencias({ categoria: categoriaSemImagem, atual });
  const resultado = await servico.atualizar("10", { idCategoria: 3 });
  assert.equal(resultado.caminhoImagem, null);
  assert.deepEqual(chamadas.removidos, [caminho]);
});

test("substituição e remoção de foto removem o arquivo anterior", async () => {
  const antigo = "temporarios/123e4567-e89b-42d3-a456-426614174001.jpg";
  const { servico, chamadas } = criarDependencias({ atual: produto({ caminhoImagem: antigo }) });
  await servico.atualizar("10", { caminhoImagem: caminho });
  assert.deepEqual(chamadas.removidos, [antigo]);
});

test("exclusão lógica remove a foto associada", async () => {
  const { servico, chamadas } = criarDependencias({ atual: produto({ caminhoImagem: caminho }) });
  await servico.excluir("10");
  assert.deepEqual(chamadas.removidos, [caminho]);
});
