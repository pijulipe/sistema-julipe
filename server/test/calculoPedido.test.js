import test from "node:test";
import assert from "node:assert/strict";
import { calcularItem, calcularDesconto, calcularFinanceiro, validarEstorno, calcularCapacidade, paraCentavos, exigeAutorizacao } from "../src/services/calculoPedido.js";
import { acessoEfetivo, autorizarStatus } from "../src/utils/acessoPedido.js";
import { validarAgendamento, dataValida } from "../src/services/agendamentoPedido.js";

test("preço de pacote e capacidade usam 50 unidades sem duplicar o múltiplo", () => {
  const item = calcularItem({ tipo: "PRODUTO", quantidade: 50 }, { id: "1", nome: "Salgados", preco: "20", multiploMinimo: 25, idCategoria: "3" });
  assert.equal(item.subtotalCentavos, "4000");
  assert.deepEqual(calcularCapacidade([{ status: "RECEBIDO", fotografia: { dataEntrega: "2026-09-07", horarioEntrega: "08:15", itens: [item] } }]), { "2026-09-07|08|3": 50 });
  assert.throws(() => calcularItem({ tipo: "PRODUTO", quantidade: 26 }, { nome: "Salgados", preco: "20", multiploMinimo: 25 }), /Escolha uma quantidade/);
});
test("combo conserva preço próprio e decompõe apenas sua capacidade", () => {
  const item = calcularItem({ tipo: "COMBO", quantidade: 2 }, { nome: "Festa", preco: "80", versao: 3, composicao: [{ idProduto: "1", idCategoria: "3", quantidade: 50 }] });
  assert.equal(item.subtotalCentavos, "16000");
  assert.equal(item.versaoCatalogo, 3);
  const fotografia = { dataEntrega: "2026-09-07", horarioEntrega: "08:30", itens: [item] };
  assert.deepEqual(calcularCapacidade([{ status: "RECEBIDO", fotografia }, { status: "ENTREGUE", fotografia }, { status: "CANCELADO", fotografia }]), { "2026-09-07|08|3": 100 });
});
test("descontos respeitam ordem e arredondamento meio para cima", () => {
  assert.equal(calcularDesconto(20000n, { percentual: "10", valorFixo: "20" }).totalCentavos, "16000");
  assert.equal(calcularDesconto(20000n, { percentual: "10", valorFixo: "20", ordem: "FIXO_PRIMEIRO" }).totalCentavos, "16200");
  assert.equal(calcularDesconto(5n, { percentual: "10" }).totalCentavos, "4");
  assert.throws(() => calcularDesconto(100n, { valorFixo: "1" }), /total maior/);
  assert.throws(() => calcularDesconto(0n), /total maior/);
  assert.throws(() => paraCentavos("0.001"), /duas casas/);
  assert.equal(exigeAutorizacao(calcularDesconto(20000n, { percentual: "10", valorFixo: "20" }), "19.99"), true);
});
test("financeiro separa rejeitados, pagamentos parciais, estornos e excedente", () => {
  const pagamentos = [{ valorCentavos: "11000", situacao: "CONFIRMADO", estornos: [] }, { valorCentavos: "5000", situacao: "REJEITADO" }];
  assert.deepEqual(calcularFinanceiro("10000", pagamentos), { recebidoCentavos: "11000", estornadoCentavos: "0", liquidoCentavos: "11000", excedenteCentavos: "1000", situacao: "PAGO" });
  pagamentos[0].estornos.push({ valorCentavos: "2000" });
  assert.equal(calcularFinanceiro("10000", pagamentos).situacao, "PARCIAL");
  pagamentos[0].estornos.push({ valorCentavos: "9000" });
  assert.equal(calcularFinanceiro("10000", pagamentos).situacao, "PENDENTE");
});
test("estorno acumulado não permite fracionar para contornar limite", () => {
  const pagamento = { valorCentavos: "10000", situacao: "CONFIRMADO", estornos: [{ valorCentavos: "2000" }] };
  assert.throws(() => validarEstorno(pagamento, "20", { perfilAcesso: "ATENDENTE", limiteEstorno: "30" }), /acumulado/);
  assert.throws(() => validarEstorno(pagamento, "81", { perfilAcesso: "GERENTE" }), /saldo/);
  assert.equal(validarEstorno(pagamento, "80", { perfilAcesso: "GERENTE" }), "8000");
});
test("cargo e exceções preservam padrões e precedência individual", () => {
  assert.equal(acessoEfetivo({ perfilAcesso: "ATENDENTE" }).podeCancelarPedido, false);
  assert.equal(acessoEfetivo({ perfilAcesso: "ADMINISTRADOR" }).podeCancelarPedido, true);
  const usuario = acessoEfetivo({ perfilAcesso: "ATENDENTE", cargo: { ativo: true, modulos: ["PEDIDOS", "CLIENTE"], limiteDesconto: "10" }, excecoesModulos: { PEDIDOS: false }, descontoIndividual: "0" });
  assert.deepEqual(usuario.permissoes, ["CLIENTES"]);
  assert.equal(usuario.limiteDesconto, "0");
});
test("produção e expedição não contornam cancelamento e reabertura", () => {
  const producao = acessoEfetivo({ perfilAcesso: "ATENDENTE", permissoes: ["PRODUCAO"] });
  autorizarStatus(producao, "RECEBIDO", "PRONTO");
  assert.throws(() => autorizarStatus(producao, "PRONTO", "ENTREGUE"), /não autorizada/);
  assert.throws(() => autorizarStatus(producao, "PRONTO", "CANCELADO"), /Pedidos necessário/);
  assert.throws(() => autorizarStatus({ perfilAcesso: "GERENTE" }, "ENTREGUE", "RECEBIDO"), /Reabra/);
});
test("agendamento valida data real, passado e intervalo de 15 minutos", () => {
  assert.equal(dataValida("2026-02-30"), false);
  const expediente = [{ diaSemana: 1, aberto: true, inicio: "08:00", fim: "18:00" }];
  const agora = new Date("2026-09-07T12:00:00Z");
  validarAgendamento("2026-09-07", "18:00", expediente, agora);
  assert.throws(() => validarAgendamento("2026-09-07", "08:10", expediente, agora), /expediente/);
  assert.throws(() => validarAgendamento("2026-09-06", "08:00", expediente, agora), /passada/);
});
