import assert from "node:assert/strict";
import test from "node:test";
import { autorizarModulo } from "../src/middlewares/autorizarModulo.js";
import { carregarAcessoAtual } from "../src/middlewares/carregarAcessoAtual.js";

const resposta = () => ({ statusRecebido: null, corpo: null, status(codigo) { this.statusRecebido = codigo; return this; }, json(corpo) { this.corpo = corpo; return this; } });

test("gerente e funcionário com COMBOS acessam o módulo", () => {
  for (const usuario of [
    { perfilAcesso: "GERENTE", permissoes: [] },
    { perfilAcesso: "ATENDENTE", permissoes: ["COMBOS"] },
  ]) {
    let autorizado = false;
    autorizarModulo("COMBOS")({ usuario }, resposta(), () => { autorizado = true; });
    assert.equal(autorizado, true);
  }
});

test("revogação de COMBOS vale na requisição seguinte", async () => {
  let permissoes = ["COMBOS"];
  const middlewareAcesso = carregarAcessoAtual({
    buscarAcessoAtualPorId: async () => ({ idUsuario: "1", perfilAcesso: "ATENDENTE", permissoes }),
  });
  async function executar() {
    const requisicao = { usuario: { idUsuario: "1" } };
    await middlewareAcesso(requisicao, resposta(), () => {});
    let autorizado = false;
    const res = resposta();
    autorizarModulo("COMBOS")(requisicao, res, () => { autorizado = true; });
    return { autorizado, status: res.statusRecebido };
  }
  assert.equal((await executar()).autorizado, true);
  permissoes = [];
  assert.equal((await executar()).status, 403);
});
