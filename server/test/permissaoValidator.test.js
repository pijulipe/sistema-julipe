import test from "node:test";
import assert from "node:assert/strict";
import { consultarCatalogoModulosSchema } from "../src/validators/permissaoValidator.js";

test("aceita consulta do catálogo sem parâmetros", () => {
  assert.equal(
    consultarCatalogoModulosSchema.safeParse({
      corpo: undefined,
      parametros: {},
      consulta: {},
    }).success,
    true,
  );
});

test("rejeita parâmetros no catálogo de módulos", () => {
  assert.equal(
    consultarCatalogoModulosSchema.safeParse({
      corpo: undefined,
      parametros: {},
      consulta: { pagina: "1" },
    }).success,
    false,
  );
  assert.equal(
    consultarCatalogoModulosSchema.safeParse({
      corpo: undefined,
      parametros: { id: "x" },
      consulta: {},
    }).success,
    false,
  );
});
