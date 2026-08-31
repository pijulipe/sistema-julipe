import test from "node:test";
import assert from "node:assert/strict";
import { autorizarModulo } from "../src/middlewares/autorizarModulo.js";

function executar(usuario) {
  let avancou = false;
  let status;
  const resposta = {
    status(codigo) { status = codigo; return this; },
    json(conteudo) { return conteudo; },
  };
  const conteudo = autorizarModulo("PRODUTO")({ usuario }, resposta, () => { avancou = true; });
  return { avancou, status, conteudo };
}

test("gerente acessa Produtos sem permissão individual", () => {
  assert.equal(executar({ perfilAcesso: "GERENTE", permissoes: [] }).avancou, true);
});

test("funcionário com PRODUTO acessa o módulo", () => {
  assert.equal(executar({ perfilAcesso: "ATENDENTE", permissoes: ["PRODUTO"] }).avancou, true);
});

test("funcionário sem PRODUTO recebe 403", () => {
  const resultado = executar({ perfilAcesso: "ATENDENTE", permissoes: ["CLIENTES"] });
  assert.equal(resultado.avancou, false);
  assert.equal(resultado.status, 403);
});

test("concessão e revogação são observadas na requisição seguinte", () => {
  const usuario = { perfilAcesso: "ATENDENTE", permissoes: [] };
  assert.equal(executar(usuario).status, 403);
  usuario.permissoes = ["PRODUTO"];
  assert.equal(executar(usuario).avancou, true);
  usuario.permissoes = [];
  assert.equal(executar(usuario).status, 403);
});
