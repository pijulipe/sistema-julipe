import test from "node:test";
import assert from "node:assert/strict";
import { autorizarStatus } from "../src/utils/acessoPedido.js";

test("retornos da Expedição exigem gerente mesmo com Pedidos e ambos os módulos", () => {
  for (const perfilAcesso of ["ATENDENTE", "ADMINISTRADOR"]) {
    for (const permissoes of [["EXPEDICAO"], ["PEDIDOS"], ["PEDIDOS", "EXPEDICAO"], ["PRODUCAO"]]) {
      for (const destino of ["PRONTO", "EM_PRODUCAO", "RECEBIDO"]) {
        assert.throws(() => autorizarStatus({ perfilAcesso, permissoes }, "EM_ROTA", destino), (erro) => erro.status === 403);
      }
    }
  }
  autorizarStatus({ perfilAcesso: "GERENTE" }, "EM_ROTA", "PRONTO");
});

test("avanços e retornos internos de Produção são preservados; concluídos exigem reabertura", () => {
  const expedicao = { perfilAcesso: "ATENDENTE", permissoes: ["EXPEDICAO"] };
  for (const [anterior, novo] of [["PRONTO", "EM_ROTA"], ["EM_ROTA", "ENTREGUE"], ["PRONTO", "ENTREGUE"]]) autorizarStatus(expedicao, anterior, novo);
  const producao = { perfilAcesso: "ATENDENTE", permissoes: ["PRODUCAO"] };
  autorizarStatus(producao, "EM_PRODUCAO", "RECEBIDO");
  autorizarStatus(producao, "PRONTO", "EM_PRODUCAO");
  for (const usuario of [expedicao, { perfilAcesso: "GERENTE" }]) {
    for (const novo of ["PRONTO", "EM_ROTA", "EM_PRODUCAO"]) assert.throws(() => autorizarStatus(usuario, "ENTREGUE", novo), (erro) => erro.status === 409);
  }
});
