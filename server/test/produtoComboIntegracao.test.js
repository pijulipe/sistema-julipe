import assert from "node:assert/strict";
import test from "node:test";
import { ProdutoRepository } from "../src/repositories/produtoRepository.js";

function criarPrismaFalso() {
  const chamadas = [];
  const produtoBanco = {
    id_produto: 1, nome: "Salgado", descricao: null, preco_unitario: 1,
    unidade_medida: "Unidade", multiplo_minimo: 25, tempo_preparo_minutos: 0,
    url_imagem: null, ativo: false,
    categorias: { id_categoria: 1, nome_categoria: "Salgados", unidades_por_pacote_padrao: 25, permite_imagem: false },
  };
  const transacao = {
    produtos: {
      update: async () => produtoBanco,
      updateMany: async () => ({ count: 1 }),
    },
    combos: { updateMany: async (argumentos) => { chamadas.push(argumentos); return { count: 2 }; } },
  };
  return {
    cliente: { $transaction: async (acao) => acao(transacao) },
    chamadas,
  };
}

test("inativar produto inativa combos relacionados na mesma transação", async () => {
  const falso = criarPrismaFalso();
  const repositorio = new ProdutoRepository(falso.cliente);
  await repositorio.atualizar(1, { ativo: false });
  assert.equal(falso.chamadas.length, 1);
  assert.deepEqual(falso.chamadas[0].data, { ativo: false });
  assert.equal(falso.chamadas[0].where.itens_combo.some.id_produto, 1);
});

test("excluir produto inativa combos e reativar produto não os reativa", async () => {
  const falso = criarPrismaFalso();
  const repositorio = new ProdutoRepository(falso.cliente);
  assert.equal(await repositorio.excluir(1), true);
  assert.equal(falso.chamadas.length, 1);
  await repositorio.atualizar(1, { ativo: true });
  assert.equal(falso.chamadas.length, 1);
});
