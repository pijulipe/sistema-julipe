import test from "node:test";
import assert from "node:assert/strict";
import { ClienteService } from "../src/services/clienteService.js";

test("lista clientes com metadados de paginação", async () => {
  const repositorio = {
    listar: async () => ({ clientes: [{ idCliente: "1", nome: "Ana" }], total: 21 }),
  };
  const servico = new ClienteService(repositorio);
  const resultado = await servico.listar({ pagina: 2, limite: 10 });

  assert.equal(resultado.dados[0].nome, "Ana");
  assert.deepEqual(resultado.paginacao, { pagina: 2, limite: 10, total: 21, totalPaginas: 3 });
});

test("retorna 404 ao consultar cliente inexistente", async () => {
  const servico = new ClienteService({ buscarPorId: async () => null });

  await assert.rejects(() => servico.buscarPorId("99"), (erro) => {
    assert.equal(erro.status, 404);
    assert.equal(erro.message, "Cliente não encontrado.");
    return true;
  });
});

test("exclusão inexistente retorna 404", async () => {
  const servico = new ClienteService({ excluir: async () => false });
  await assert.rejects(() => servico.excluir("99"), { status: 404 });
});
