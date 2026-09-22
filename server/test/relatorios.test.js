import test from "node:test";
import assert from "node:assert/strict";
import { PedidoService } from "../src/services/pedidoService.js";

test("Relatórios consulta fotografias e finanças sem permissões de cadastros; revogação bloqueia", async () => {
  const registros = [{ id_pedido: 9007199254740993n, status_pedido: "CANCELADO", fotografia: { totalCentavos: "10000", itens: [{ tipo: "COMBO", idCadastro: "9007199254740993", nome: "Combo histórico" }] }, pagamentosVenda: [{ situacao: "CONFIRMADO", valorCentavos: "11000", estornos: [{ valorCentavos: "3000" }] }] }];
  const repository = { todos: async () => registros, transacao: async (acao) => acao(repository) };
  const servico = new PedidoService(repository);
  const usuario = { perfilAcesso: "ATENDENTE", permissoes: ["RELATORIO"] };
  const [pedido] = await servico.painel(usuario);
  assert.equal(pedido.idPedido, "9007199254740993");
  assert.equal(pedido.fotografia.itens[0].nome, "Combo histórico");
  assert.equal(pedido.financeiro.liquidoCentavos, "8000");
  const resumo = await servico.indicadores({});
  assert.equal(resumo.faturamentoCentavos, 0n);
  assert.equal(resumo.recebidoCentavos, 11000n);
  assert.equal(resumo.estornadoCentavos, 3000n);
  await assert.rejects(() => servico.painel({ ...usuario, permissoes: [] }), { status: 403 });
});
