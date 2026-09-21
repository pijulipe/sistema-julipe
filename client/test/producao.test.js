import test from "node:test";
import assert from "node:assert/strict";
import { alterouPreparo, alteracaoPreparoAuditada, dataOperacao, filtrarProducao, permissoesProducao, produtosParaPreparo } from "../src/utils/producao.js";

const pedido = (id, dataEntrega, horarioEntrega, status = "recebido") => ({ id, dataEntrega, horarioEntrega, status, statusPagamento: "pendente", cliente: { nome: "Maria" }, itens: [{ nome: "Coxinha" }] });
const hoje = "2026-09-16";
const pedidos = [pedido("10", hoje, "14:00"), pedido("2", "2026-09-15", "16:00", "em_producao"), pedido("3", hoje, "08:00", "pronto"), pedido("4", "2026-09-17", "08:00"), ...["em_rota", "entregue", "cancelado"].map((status, indice) => pedido(String(5 + indice), hoje, "08:00", status))];

test("Hoje inclui atrasados, ordena por agendamento e conta só as três etapas", () => {
  assert.deepEqual(filtrarProducao(pedidos, { hoje }).map((item) => item.id), ["2", "3", "10"]);
  assert.equal(filtrarProducao(pedidos, { periodo: "todos", hoje }).length, 4);
  assert.equal(pedidos[0].id, "10", "Não deve reordenar a coleção compartilhada.");
});
test("data da operação não antecipa o dia à meia-noite UTC", () => {
  assert.equal(dataOperacao(new Date("2026-09-17T02:59:59Z")), hoje);
  assert.equal(dataOperacao(new Date("2026-09-17T03:00:00Z")), "2026-09-17");
});
test("busca por número, cliente e produto combina com data e pagamento", () => {
  assert.deepEqual(filtrarProducao(pedidos, { busca: "#10", hoje }).map((item) => item.id), ["10"]);
  assert.equal(filtrarProducao(pedidos, { busca: " MARIA ", hoje }).length, 3);
  assert.equal(filtrarProducao(pedidos, { busca: "coxinha", periodo: "data", data: hoje, hoje }).length, 2);
  assert.equal(filtrarProducao(pedidos, { pagamento: "pago", hoje }).length, 0);
  assert.equal(filtrarProducao(pedidos, { periodo: "data", data: "2026-09-17", hoje }).length, 1);
});
test("semana e mês preservam limites incluindo virada de ano", () => {
  const lista = [pedido("1", "2025-12-28", "08:00"), pedido("2", "2025-12-29", "08:00"), pedido("3", "2026-01-04", "08:00"), pedido("4", "2026-01-05", "08:00")];
  assert.deepEqual(filtrarProducao(lista, { periodo: "semana", hoje: "2026-01-01" }).map((item) => item.id), ["2", "3"]);
  assert.deepEqual(filtrarProducao(lista, { periodo: "mes", hoje: "2026-01-01" }).map((item) => item.id), ["3", "4"]);
});
const item = { chaveItem: "item-1", tipo: "COMBO", idCadastro: "1", nome: "Festa", quantidade: 2, composicao: [{ nome: "Coxinha histórica", quantidade: 50, multiploMinimo: 25 }] };
const fotografia = { dataEntrega: hoje, horarioEntrega: "10:00", observacoes: "Sem amendoim", detalhesPersonalizacao: "Azul", itens: [item] };
test("preparo usa composição persistida e não duplica múltiplos", () => {
  assert.deepEqual(produtosParaPreparo(item), [{ nome: "Coxinha histórica", quantidade: 100 }]);
  assert.deepEqual(produtosParaPreparo({ nome: "Coxinha", tipo: "PRODUTO", quantidade: 50, multiploMinimo: 25 }), [{ nome: "Coxinha", quantidade: 50 }]);
});
test("recargas, preços, ordem da composição e URLs assinadas não inventam alterações", () => {
  assert.equal(alterouPreparo(fotografia, structuredClone(fotografia)), false);
  assert.equal(alterouPreparo(null, fotografia), false);
  assert.equal(alterouPreparo(fotografia, { ...fotografia, totalCentavos: "9000", itens: [{ ...item, urlFoto: "temporaria", precoPacoteCentavos: "123" }] }), false);
  assert.equal(alteracaoPreparoAuditada({ dados: { anterior: "RECEBIDO", novo: "EM_PRODUCAO" } }), false);
  assert.equal(alteracaoPreparoAuditada({ dados: { anterior: null, novo: fotografia } }), false);
});
test("mudanças de itens, composição, foto, observações, personalização e agenda são relevantes", () => {
  for (const mudanca of [{ horarioEntrega: "11:00" }, { dataEntrega: "2026-09-17" }, { observacoes: "Sem leite" }, { detalhesPersonalizacao: "Rosa" }, { itens: [] }, { itens: [{ ...item, quantidade: 3 }] }, { itens: [{ ...item, foto: "referencia/nova" }] }, { itens: [{ ...item, observacoes: "Separar" }] }, { itens: [{ ...item, composicao: [{ nome: "Coxinha histórica", quantidade: 75 }] }] }]) {
    assert.equal(alteracaoPreparoAuditada({ dados: { anterior: fotografia, novo: { ...fotografia, ...mudanca } } }), true);
  }
});
test("Produção isolada não concede edição ou cancelamento, inclusive com capacidade individual", () => {
  assert.deepEqual(permissoesProducao({ perfilAcesso: "ATENDENTE", permissoes: ["PRODUCAO"], podeCancelarPedido: true }), { editar: false, cancelar: false, operar: true });
  assert.deepEqual(permissoesProducao({ perfilAcesso: "ATENDENTE", permissoes: ["PEDIDOS"], podeCancelarPedido: false }), { editar: true, cancelar: false, operar: true });
  assert.equal(permissoesProducao({ perfilAcesso: "GERENTE" }).cancelar, true);
  assert.equal(permissoesProducao(null).operar, false);
});
