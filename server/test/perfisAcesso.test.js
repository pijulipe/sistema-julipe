import test from "node:test";
import assert from "node:assert/strict";
import {
  perfisAcessoValidos,
  perfilAcessoValido,
} from "../src/utils/perfisAcesso.js";

test("expõe e protege os perfis de acesso válidos", () => {
  assert.deepEqual(perfisAcessoValidos, [
    "ATENDENTE",
    "ADMINISTRADOR",
    "GERENTE",
  ]);
  assert.equal(Object.isFrozen(perfisAcessoValidos), true);
});

test("valida somente perfis de acesso canônicos", () => {
  assert.equal(perfilAcessoValido("ATENDENTE"), true);
  assert.equal(perfilAcessoValido("ADMINISTRADOR"), true);
  assert.equal(perfilAcessoValido("GERENTE"), true);
  assert.equal(perfilAcessoValido("gerente"), false);
  assert.equal(perfilAcessoValido("DONO"), false);
  assert.equal(perfilAcessoValido(undefined), false);
});
