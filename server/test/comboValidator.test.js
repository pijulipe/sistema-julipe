import assert from "node:assert/strict";
import test from "node:test";
import { criarComboSchema } from "../src/validators/comboValidator.js";

const entrada = (corpo) => ({ corpo, parametros: {}, consulta: {} });

test("valida contrato de criação de combo", () => {
  const base = { nome: "Combo", descricao: null, preco: 0, ativo: true, itens: [{ idProduto: 1, quantidade: 1 }] };
  assert.equal(criarComboSchema.safeParse(entrada(base)).success, true);
  for (const corpo of [
    { ...base, nome: " " }, { ...base, preco: -1 }, { ...base, itens: [] },
    { ...base, itens: [{ idProduto: 1, quantidade: 0 }] }, { ...base, desconhecido: true },
  ]) assert.equal(criarComboSchema.safeParse(entrada(corpo)).success, false);
});
