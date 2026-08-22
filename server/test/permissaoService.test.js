import test from "node:test";
import assert from "node:assert/strict";
import { PermissaoService } from "../src/services/permissaoService.js";
import { catalogoModulos } from "../src/utils/modulos.js";

test("service lista o catálogo oficial de módulos", () => {
  const service = new PermissaoService();

  assert.equal(service.listarModulos(), catalogoModulos);
});
