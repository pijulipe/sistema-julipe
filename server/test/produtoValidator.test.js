import test from "node:test";
import assert from "node:assert/strict";
import {
  autorizarUploadSchema,
  criarProdutoSchema,
  listarProdutosSchema,
} from "../src/validators/produtoValidator.js";

const produtoValido = {
  nome: "Coxinha",
  descricao: null,
  idCategoria: 3,
  precoUnitario: 35.5,
  unidadeMedida: "Pacote",
  multiploMinimo: 25,
  tempoPreparoMinutos: 40,
  ativo: true,
  caminhoImagem: null,
};

test("aceita contrato válido de produto", () => {
  assert.equal(criarProdutoSchema.safeParse({
    corpo: produtoValido, parametros: {}, consulta: {},
  }).success, true);
});

for (const [campo, valor] of [
  ["precoUnitario", -1],
  ["multiploMinimo", 0],
  ["multiploMinimo", 1.5],
  ["tempoPreparoMinutos", -1],
  ["tempoPreparoMinutos", 2.5],
  ["unidadeMedida", "Caixa"],
]) {
  test(`rejeita ${campo} inválido`, () => {
    const resultado = criarProdutoSchema.safeParse({
      corpo: { ...produtoValido, [campo]: valor }, parametros: {}, consulta: {},
    });
    assert.equal(resultado.success, false);
  });
}

test("normaliza filtros e paginação da listagem", () => {
  const resultado = listarProdutosSchema.parse({
    corpo: undefined,
    parametros: {},
    consulta: { busca: "bolo", idCategoria: "1", ativo: "false", pagina: "2", limite: "10" },
  });
  assert.deepEqual(resultado.consulta, {
    busca: "bolo", idCategoria: 1, ativo: false, pagina: 2, limite: 10,
  });
});

for (const corpo of [
  { nomeArquivo: "foto.gif", tipoMime: "image/gif", tamanho: 100 },
  { nomeArquivo: "foto.png", tipoMime: "image/png", tamanho: 5 * 1024 * 1024 + 1 },
]) {
  test("rejeita metadados inválidos de upload", () => {
    assert.equal(autorizarUploadSchema.safeParse({ corpo, parametros: {}, consulta: {} }).success, false);
  });
}
