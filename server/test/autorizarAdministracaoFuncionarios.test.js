import test from "node:test";
import assert from "node:assert/strict";
import { autorizarAdministracaoFuncionarios } from "../src/middlewares/autorizarAdministracaoFuncionarios.js";

function executar(usuario) {
  let status;
  let conteudo;
  let proximoChamado = false;
  const resposta = {
    status(codigo) {
      status = codigo;
      return this;
    },
    json(dados) {
      conteudo = dados;
      return dados;
    },
  };

  autorizarAdministracaoFuncionarios({ usuario }, resposta, () => {
    proximoChamado = true;
  });

  return { status, conteudo, proximoChamado };
}

test("gerente acessa a administração de funcionários", () => {
  const resultado = executar({ perfilAcesso: "GERENTE" });

  assert.equal(resultado.proximoChamado, true);
  assert.equal(resultado.status, undefined);
});

test("administrador acessa a administração de funcionários", () => {
  const resultado = executar({ perfilAcesso: "ADMINISTRADOR" });

  assert.equal(resultado.proximoChamado, true);
  assert.equal(resultado.status, undefined);
});

test("atendente recebe 403 na administração de funcionários", () => {
  const resultado = executar({ perfilAcesso: "ATENDENTE" });

  assert.equal(resultado.proximoChamado, false);
  assert.equal(resultado.status, 403);
  assert.deepEqual(resultado.conteudo, {
    mensagem: "Acesso à administração de funcionários não autorizado.",
  });
});

test("usuário ausente recebe 403 na administração de funcionários", () => {
  const resultado = executar(undefined);

  assert.equal(resultado.proximoChamado, false);
  assert.equal(resultado.status, 403);
});
