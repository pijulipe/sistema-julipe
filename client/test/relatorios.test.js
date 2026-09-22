import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { criarAmbiente, criarPedido, cenarioRelatorios } from "./apoio/ambienteRelatorios.js";
import { construirVendasProdutos, itensVendidos, resumirFinanceiro, pedidosPorHora } from "../src/utils/relatorios.js";

test("pacotes, combos e BIGINT preservam identidade e quantidade sem componentes duplicados", () => {
  const vendas = construirVendasProdutos(cenarioRelatorios());
  assert.equal(vendas.length, 2);
  assert.deepEqual(vendas.map(({ id, quantidade, revenue }) => ({ id, quantidade, revenue })), [
    { id: "PRODUTO:9007199254740993", quantidade: 50, revenue: 40 },
    { id: "COMBO:9007199254740993", quantidade: 2, revenue: 180 },
  ]);
  assert.equal(vendas[1].categoria, "Combos");
  assert.equal(vendas[1].nome, "Combo Festa histórico");
});

test("desconto proporcional conserva os centavos do total, inclusive resíduos", () => {
  const item = criarPedido().fotografia.itens[0];
  const pedido = criarPedido({ itens: [1, 2, 3].map((id) => ({ ...item, idCadastro: String(id), subtotalCentavos: "100" })), total: "100" });
  assert.deepEqual(itensVendidos(pedido).map((item) => item.centavos), [33n, 34n, 33n]);
  assert.equal(itensVendidos(pedido).reduce((soma, item) => soma + item.centavos, 0n), 100n);
});

test("cancelamento exclui venda e preserva dinheiro recebido e estornado", () => {
  const resumo = resumirFinanceiro(cenarioRelatorios());
  assert.equal(resumo.faturamentoCentavos, 22000n);
  assert.equal(resumo.recebidoCentavos, 24000n);
  assert.equal(resumo.estornadoCentavos, 3000n);
  assert.equal(resumo.liquidoCentavos, 21000n);
  assert.equal(resumo.saldoCentavos, 5000n);
});

test("parcial, rejeitado, excedente, estorno parcial e integral reutilizam financeiro da API", () => {
  for (const [valor, estorno, situacao, bruto, liquido, excedente] of [
    ["2000", "0", "CONFIRMADO", 2000n, 2000n, 0n],
    ["9000", "0", "REJEITADO", 0n, 0n, 0n],
    ["5000", "0", "CONFIRMADO", 5000n, 5000n, 1000n],
    ["4000", "1000", "CONFIRMADO", 4000n, 3000n, 0n],
    ["4000", "4000", "ESTORNADO", 4000n, 0n, 0n],
  ]) {
    const pedido = criarPedido({ pagamentos: [{ forma: "PIX", situacao, valorCentavos: valor, estornos: [{ valorCentavos: estorno }] }] });
    const resumo = resumirFinanceiro([pedido]);
    assert.equal(resumo.recebidoCentavos, bruto);
    assert.equal(resumo.liquidoCentavos, liquido);
    assert.equal(resumo.excedenteCentavos, excedente);
  }
});

test("horários fora da faixa original aparecem; ausentes e inválidos não viram meia-noite", () => {
  const dados = pedidosPorHora([...cenarioRelatorios(), { horarioEntrega: "" }, { horarioEntrega: "25:00" }]);
  assert.equal(dados.find((item) => item.label === "06:00").value, 2);
  assert.equal(dados.find((item) => item.label === "23:00").value, 1);
  assert.equal(dados.reduce((soma, item) => soma + item.value, 0), 3);
});

test("legados permanecem identificados, sem inventar vendas ou recebimentos", () => {
  const legado = { id: "99", status: "recebido", fotografia: null, financeiro: null };
  const resumo = resumirFinanceiro([legado]);
  assert.equal(resumo.legados, 1);
  assert.equal(resumo.faturamentoCentavos, 0n);
  assert.equal(resumo.recebidoCentavos, 0n);
  assert.deepEqual(construirVendasProdutos([legado]), []);
});

for (const aba of ["visao-geral", "vendas", "clientes", "financeiro", "operacional"]) {
  test(`renderiza ${aba} com histórico independente de cadastros administrativos`, async () => {
    const servidor = await criarAmbiente({ aba });
    try {
      const { default: Painel } = await servidor.ssrLoadModule('/src/RelatoriosPanel.jsx');
      const html = renderToStaticMarkup(React.createElement(Painel));
      assert.ok(html.includes("Relatórios"));
      assert.ok(!html.includes("Produto removido"));
      if (aba === "vendas") assert.ok(html.includes("Combo Festa histórico"));
      if (aba === "operacional") assert.ok(html.includes("Cancelado"));
      if (aba === "financeiro") assert.ok(html.includes("Recebido líquido"));
    } finally { await servidor.close(); }
  });
}

test("falha e carregamento não exibem zeros confiáveis; vazio é resultado distinto", async () => {
  for (const opcoes of [{ erro: "Falha fictícia" }, { carregando: true }, { pedidos: [] }]) {
    const servidor = await criarAmbiente(opcoes);
    try {
      const { default: Painel } = await servidor.ssrLoadModule('/src/RelatoriosPanel.jsx');
      const html = renderToStaticMarkup(React.createElement(Painel));
      if (opcoes.erro) { assert.ok(html.includes('role="alert"')); assert.ok(html.includes('Tentar novamente')); }
      else if (opcoes.carregando) assert.ok(html.includes("Carregando relatórios"));
      else assert.ok(html.includes("0 pedidos"));
      if (opcoes.erro || opcoes.carregando) assert.ok(!html.includes("Faturamento"));
    } finally { await servidor.close(); }
  }
});

test("CSV mantém colunas, cancelados, BOM e escape; datas locais e intervalos preservados", async () => {
  const servidor = await criarAmbiente();
  const documento = globalThis.document;
  const criarUrl = URL.createObjectURL;
  let arquivo;
  globalThis.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
  URL.createObjectURL = (blob) => { arquivo = blob; return 'blob:teste'; };
  try {
    const modulo = await servidor.ssrLoadModule('/src/RelatoriosPanel.jsx');
    const pedidos = cenarioRelatorios();
    pedidos[0].cliente.nome = 'Maria "Teste"; Centro';
    modulo.exportarPedidosCSV(pedidos);
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
    const csv = await arquivo.text();
    assert.equal(csv.split('\n').length, 4);
    assert.equal(csv.split('\n')[0], '"Data";"Horário";"Cliente";"Telefone";"Itens";"Subtotal";"Desconto";"Total";"Status";"Tipo";"Pagamento"');
    assert.ok(csv.includes('"cancelado"'));
    assert.ok(csv.includes('"Maria ""Teste""; Centro"'));
    const intervalo = modulo.computeRange('custom', [], { start: '2026-09-30', end: '2026-10-01' });
    assert.deepEqual(modulo.eachDayISO(intervalo.start, intervalo.end), ['2026-09-30', '2026-10-01']);
  } finally { globalThis.document = documento; URL.createObjectURL = criarUrl; await servidor.close(); }
});

test("ticket exclui cancelado e recorrência só começa na segunda compra válida até o fim do filtro", async () => {
  const pedidos = [criarPedido({ data: "2026-09-01" }), criarPedido({ id: "2", data: "2026-09-02", status: "CANCELADO" }), criarPedido({ id: "3", data: "2026-10-01" })];
  for (const [fim, recorrente] of [["2026-09-30", false], ["2026-10-01", true]]) {
    const servidor = await criarAmbiente({ aba: "clientes", pedidos, preset: "custom", intervalo: { start: "2026-09-01", end: fim } });
    try {
      const { default: Painel } = await servidor.ssrLoadModule('/src/RelatoriosPanel.jsx');
      const html = renderToStaticMarkup(React.createElement(Painel));
      assert.equal(html.includes('>Recorrentes</button>'), recorrente);
      assert.equal(html.includes('>Único Pedido</button>'), !recorrente);
    } finally { await servidor.close(); }
  }
  const servidor = await criarAmbiente({ pedidos: pedidos.slice(0, 2) });
  try {
    const { default: Painel } = await servidor.ssrLoadModule('/src/RelatoriosPanel.jsx');
    const html = renderToStaticMarkup(React.createElement(Painel)).replaceAll('\u00a0', ' ');
    assert.match(html, /R\$ 40,00<\/div><div[^>]*>Ticket Médio/);
  } finally { await servidor.close(); }
});

test("recebimento de setembro de pedido de outubro pertence a outubro; histórico próprio permanece", async () => {
  const pedidos = [criarPedido({ data: "2026-10-01", pagamentos: [{ forma: "PIX", situacao: "CONFIRMADO", valorCentavos: "4000", estornos: [], criadoEm: "2026-09-01" }] })];
  for (const [inicio, fim, esperado] of [["2026-09-01", "2026-09-30", "0,00"], ["2026-10-01", "2026-10-01", "40,00"]]) {
    const servidor = await criarAmbiente({ pedidos, preset: "custom", intervalo: { start: inicio, end: fim } });
    try {
      const { default: Painel } = await servidor.ssrLoadModule('/src/RelatoriosPanel.jsx');
      const html = renderToStaticMarkup(React.createElement(Painel)).replaceAll('\u00a0', ' ');
      assert.ok(html.includes(`Recebido bruto</p><strong>R$ ${esperado}</strong>`));
      assert.ok(html.includes("Com base em todos os pedidos já cadastrados"));
    } finally { await servidor.close(); }
  }
});
