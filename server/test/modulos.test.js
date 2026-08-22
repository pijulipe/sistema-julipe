import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogoModulos,
  chavesModulos,
  moduloValido,
} from "../src/utils/modulos.js";

const chavesEsperadas = [
  "PEDIDOS",
  "PRODUCAO",
  "PRODUTO",
  "COMBOS",
  "RELATORIO",
  "CLIENTES",
  "ESTOQUE",
  "EXPEDICAO",
  "FUNCIONARIOS",
];

test("expõe o catálogo inicial na ordem definida", () => {
  assert.equal(catalogoModulos.length, 9);
  assert.deepEqual(chavesModulos, chavesEsperadas);
  assert.deepEqual(
    catalogoModulos.map((modulo) => modulo.chave),
    chavesEsperadas,
  );
});

test("mantém as chaves do catálogo únicas", () => {
  assert.equal(new Set(chavesModulos).size, chavesModulos.length);
});

test("valida somente chaves canônicas do catálogo", () => {
  assert.equal(moduloValido("CLIENTES"), true);
  assert.equal(moduloValido("PEDIDOS"), true);
  assert.equal(moduloValido("clientes"), false);
  assert.equal(moduloValido(" CLIENTES "), false);
  assert.equal(moduloValido("CONFIGURACOES"), false);
  assert.equal(moduloValido(null), false);
});

test("protege o catálogo, seus itens e as chaves contra alterações", () => {
  assert.equal(Object.isFrozen(catalogoModulos), true);
  assert.equal(catalogoModulos.every(Object.isFrozen), true);
  assert.equal(Object.isFrozen(chavesModulos), true);
  assert.throws(() => catalogoModulos.push({ chave: "OUTRO", nome: "Outro" }));
  assert.throws(() => {
    catalogoModulos[0].chave = "OUTRO";
  });
});
