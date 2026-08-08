import test from "node:test";
import assert from "node:assert/strict";
import { autorizarModulo } from "../src/middlewares/autorizarModulo.js";

function executar(usuario) {
  let status;
  let proximoChamado = false;
  const resposta = {
    status(codigo) { status = codigo; return this; },
    json(conteudo) { return conteudo; },
  };
  autorizarModulo("CLIENTES")({ usuario }, resposta, () => { proximoChamado = true; });
  return { status, proximoChamado };
}

test("gerente acessa clientes sem permissão explícita", () => {
  assert.equal(executar({ perfilAcesso: "GERENTE", permissoes: [] }).proximoChamado, true);
});

test("funcionário com permissão acessa clientes", () => {
  assert.equal(executar({ perfilAcesso: "ATENDENTE", permissoes: ["CLIENTES"] }).proximoChamado, true);
});

test("funcionário sem permissão recebe 403", () => {
  assert.equal(executar({ perfilAcesso: "ATENDENTE", permissoes: [] }).status, 403);
});
