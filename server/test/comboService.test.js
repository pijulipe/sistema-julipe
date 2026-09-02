import assert from "node:assert/strict";
import test from "node:test";
import { ComboService } from "../src/services/comboService.js";

const produto = (idProduto, multiploMinimo = 1) => ({ idProduto: String(idProduto), nome: `Produto ${idProduto}`, multiploMinimo });
const atual = (sobrescrever = {}) => ({
  idCombo: "1", nome: "Festa", descricao: "Descrição", preco: 20, versao: 1, ativo: true,
  itens: [{ idProduto: "1", quantidade: 2, produto: produto(1, 2) }], ...sobrescrever,
});

function criarCenario(opcoes = {}) {
  let registro = opcoes.atual === undefined ? atual() : opcoes.atual;
  const nomes = opcoes.nomes || [];
  const produtos = opcoes.produtos || [produto(1, 2), produto(2, 1)];
  const repositorio = {
    async buscarPorNomeNormalizado(nome, ignorar) {
      return nomes.some((item) => item.nome === nome && String(item.id) !== String(ignorar)) ? "9" : null;
    },
    async buscarProdutosPorIds(ids) { return produtos.filter((item) => ids.includes(Number(item.idProduto))); },
    async buscarPorId() { return registro; },
    async criar(dados) { registro = atual({ ...dados, versao: 1 }); return registro; },
    async listar() { return { combos: registro ? [registro] : [], total: registro ? 1 : 0 }; },
    async atualizar(id, dados) {
      if (opcoes.falharAtualizacao) throw new Error("falha transacional");
      registro = { ...registro, ...dados, versao: registro.versao + (dados.incrementarVersao ? 1 : 0) };
      delete registro.incrementarVersao;
      return registro;
    },
    async excluir() { if (!registro) return false; registro = null; return true; },
  };
  return { service: new ComboService(repositorio), obterRegistro: () => registro };
}

test("cadastra combo válido com preço zero", async () => {
  const { service } = criarCenario({ atual: null });
  const combo = await service.criar({ nome: "Festa", descricao: "", preco: 0, ativo: true, itens: [{ idProduto: 1, quantidade: 2 }] });
  assert.equal(combo.preco, 0);
  assert.equal(combo.descricao, null);
});

test("rejeita nome duplicado ignorando caixa e espaços", async () => {
  const { service } = criarCenario({ nomes: [{ id: 9, nome: "festa" }] });
  await assert.rejects(() => service.criar({ nome: " FESTA ", preco: 1, ativo: true, itens: [{ idProduto: 1, quantidade: 2 }] }), { status: 409 });
});

test("permite reutilizar nome quando não há combo não excluído", async () => {
  const { service } = criarCenario({ atual: null, nomes: [] });
  await assert.doesNotReject(() => service.criar({ nome: "Festa", preco: 1, ativo: true, itens: [{ idProduto: 1, quantidade: 2 }] }));
});

test("rejeita combo sem itens, produto repetido e quantidade inválida", async (t) => {
  const { service } = criarCenario();
  await t.test("sem itens", () => assert.rejects(() => service.validarComposicao([]), { status: 422 }));
  await t.test("repetido", () => assert.rejects(() => service.validarComposicao([{ idProduto: 1, quantidade: 2 }, { idProduto: 1, quantidade: 2 }]), { status: 422 }));
  await t.test("quantidade zero", () => assert.rejects(() => service.validarComposicao([{ idProduto: 1, quantidade: 0 }]), { status: 422 }));
});

test("rejeita produto inexistente, inativo ou excluído", async () => {
  const { service } = criarCenario({ produtos: [] });
  await assert.rejects(() => service.validarComposicao([{ idProduto: 99, quantidade: 1 }]), { status: 422 });
});

test("rejeita quantidade incompatível com múltiplo mínimo", async () => {
  const { service } = criarCenario();
  await assert.rejects(() => service.validarComposicao([{ idProduto: 1, quantidade: 3 }]), { status: 422 });
});

test("descrição isolada e atualização idempotente não incrementam versão", async () => {
  const { service } = criarCenario();
  assert.equal((await service.atualizar("1", { descricao: "Nova" })).versao, 1);
  assert.equal((await service.atualizar("1", { nome: "Festa", preco: 20 })).versao, 1);
});

test("nome, preço e composição incrementam versão", async (t) => {
  for (const [titulo, dados] of [
    ["nome", { nome: "Outra" }], ["preço", { preco: 21 }],
    ["composição", { itens: [{ idProduto: 2, quantidade: 1 }] }],
  ]) await t.test(titulo, async () => assert.equal((await criarCenario().service.atualizar("1", dados)).versao, 2));
});

test("ordem diferente da composição não gera falso incremento", async () => {
  const combo = atual({ itens: [
    { idProduto: "1", quantidade: 2, produto: produto(1, 2) },
    { idProduto: "2", quantidade: 1, produto: produto(2) },
  ] });
  const { service } = criarCenario({ atual: combo });
  const resultado = await service.atualizar("1", { itens: [{ idProduto: 2, quantidade: 1 }, { idProduto: 1, quantidade: 2 }] });
  assert.equal(resultado.versao, 1);
});

test("reativa combo válido e bloqueia reativação com composição inválida", async () => {
  const valido = criarCenario({ atual: atual({ ativo: false }) });
  assert.equal((await valido.service.atualizar("1", { ativo: true })).ativo, true);
  const invalido = criarCenario({ atual: atual({ ativo: false }), produtos: [] });
  await assert.rejects(() => invalido.service.atualizar("1", { ativo: true }), { status: 422 });
});

test("combo excluído não pode ser reativado", async () => {
  const { service } = criarCenario({ atual: null });
  await assert.rejects(() => service.atualizar("1", { ativo: true }), { status: 404 });
});

test("falha na alteração não deixa composição parcialmente atualizada", async () => {
  const cenario = criarCenario({ falharAtualizacao: true });
  const antes = structuredClone(cenario.obterRegistro());
  await assert.rejects(() => cenario.service.atualizar("1", { itens: [{ idProduto: 2, quantidade: 1 }] }));
  assert.deepEqual(cenario.obterRegistro(), antes);
});
