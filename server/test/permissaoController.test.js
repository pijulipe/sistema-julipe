import test from "node:test";
import assert from "node:assert/strict";
import { PermissaoController } from "../src/controllers/permissaoController.js";

test("controller responde o catálogo de módulos", async () => {
  const modulos = [{ chave: "PEDIDOS", nome: "Pedidos" }];
  const controller = new PermissaoController({ listarModulos: () => modulos });
  const resposta = {
    statusRecebido: null,
    corpoRecebido: null,
    status(status) {
      this.statusRecebido = status;
      return this;
    },
    json(corpo) {
      this.corpoRecebido = corpo;
      return this;
    },
  };

  await controller.listarModulos({}, resposta);

  assert.equal(resposta.statusRecebido, 200);
  assert.deepEqual(resposta.corpoRecebido, { dados: modulos });
});
