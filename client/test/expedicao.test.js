import test from "node:test";
import assert from "node:assert/strict";
import { dataOperacao } from "../src/utils/producao.js";
import { resumirExpedicao, filtrarExpedicao } from "../src/utils/expedicao.js";

const hoje = "2026-09-29";
const pedido = (id, status, tipoEntrega = "entrega", dataEntrega = hoje) => ({ id, status, tipoEntrega, dataEntrega, horarioEntrega: "12:00", cliente: { nome: "Maria", telefone: "11999999999" }, bairro: "Centro" });

test("Expedição acompanha meia-noite de São Paulo, inclusive virada de mês e ano", () => {
  for (const [antes, depois, anterior, seguinte] of [
    ["2026-09-29T02:59:59Z", "2026-09-29T03:00:00Z", "2026-09-28", hoje],
    ["2026-10-01T02:59:59Z", "2026-10-01T03:00:00Z", "2026-09-30", "2026-10-01"],
    ["2027-01-01T02:59:59Z", "2027-01-01T03:00:00Z", "2026-12-31", "2027-01-01"],
  ]) {
    assert.equal(dataOperacao(new Date(antes)), anterior);
    assert.equal(dataOperacao(new Date(depois)), seguinte);
    const pedidos = [pedido("1", "pronto", "entrega", anterior), pedido("2", "entregue", "retirada", seguinte)];
    assert.equal(resumirExpedicao(pedidos, dataOperacao(new Date(antes))).ativos[0].id, "1");
    assert.equal(resumirExpedicao(pedidos, dataOperacao(new Date(depois))).concluidos[0].id, "2");
  }
});

test("contadores usam estado e agendamento, excluindo cancelados e outros dias", () => {
  const pedidos = [pedido("1", "pronto"), pedido("2", "em_rota"), pedido("3", "entregue"), pedido("4", "entregue", "retirada"), pedido("5", "cancelado"), pedido("6", "pronto", "entrega", "2026-09-28"), pedido("7", "entregue", "entrega", "2026-09-30"), pedido("8", "em_producao")];
  pedidos[2].concluidoEm = "2026-09-30T03:00:00Z";
  const resumo = resumirExpedicao(pedidos, hoje);
  assert.deepEqual(resumo.contadores, { prontos: 1, emRota: 1, entregues: 1, retirados: 1 });
  assert.deepEqual(resumo.ativos.map((p) => p.id), ["1", "2"]);
  assert.deepEqual(resumo.concluidos.map((p) => p.id), ["3", "4"]);
  assert.deepEqual(resumirExpedicao(JSON.parse(JSON.stringify(pedidos)), hoje), resumo);
  pedidos[1].status = "pronto";
  assert.deepEqual(resumirExpedicao(pedidos, hoje).contadores, { prontos: 2, emRota: 0, entregues: 1, retirados: 1 });
  pedidos[2].status = "em_producao";
  assert.equal(resumirExpedicao(pedidos, hoje).contadores.entregues, 0);
});

test("busca e ordenação funcionam nas duas listas sem modificar contadores", () => {
  const pedidos = [pedido("1", "pronto"), { ...pedido("2", "entregue"), horarioEntrega: "10:00" }];
  assert.deepEqual(filtrarExpedicao(pedidos, " MARIA ").map((p) => p.id), ["2", "1"]);
  assert.equal(filtrarExpedicao(pedidos, "Centro").length, 2);
  assert.equal(filtrarExpedicao(pedidos, "11999").length, 2);
  assert.equal(filtrarExpedicao(pedidos, "ausente").length, 0);
  assert.equal(resumirExpedicao(pedidos, hoje).contadores.entregues, 1);
});
