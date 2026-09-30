// Exclusivo do ambienteVisual.js descartável. Endereços locais explícitos, sem .env.
import { randomUUID } from "node:crypto";
const autenticacao = await fetch("http://127.0.0.1:55440/auth/v1/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "gerente@teste.invalid", password: "Teste-local-2026!" }) }).then((resposta) => resposta.json());
const sessao = await fetch("http://127.0.0.1:3334/api/autenticacao/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenSupabase: autenticacao.access_token }) }).then((resposta) => resposta.json());
if (!sessao.dados?.token) throw new Error("Não foi possível iniciar sessão local.");
async function consultar(caminho, corpo) {
  const resposta = await fetch(`http://127.0.0.1:3334/api/pedidos${caminho}`, { method: corpo ? "POST" : "GET", headers: { Authorization: `Bearer ${sessao.dados.token}`, "Content-Type": "application/json" }, ...(corpo && { body: JSON.stringify(corpo) }) });
  const resultado = await resposta.json();
  if (!resposta.ok) throw new Error(resultado.mensagem);
  return resultado.dados;
}
const catalogo = await consultar("/venda");
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const amanha = new Date(`${hoje}T12:00:00Z`);
amanha.setUTCDate(amanha.getUTCDate() + 1);
for (const [indice, [tipoEntrega, status, dataEntrega]] of [
  ["ENTREGA", "PRONTO", hoje], ["RETIRADA", "PRONTO", hoje], ["ENTREGA", "EM_ROTA", hoje],
  ["ENTREGA", "ENTREGUE", hoje], ["RETIRADA", "ENTREGUE", hoje], ["ENTREGA", "CANCELADO", hoje],
  ["ENTREGA", "PRONTO", amanha.toISOString().slice(0, 10)],
].entries()) {
  const pedido = await consultar("", { chaveOperacao: randomUUID(), dados: {
    idCliente: catalogo.clientes[0].idCliente, tipoEntrega, dataEntrega, horarioEntrega: `${10 + indice}:00`,
    endereco: tipoEntrega === "ENTREGA" ? { rua: "Rua de teste", numero: String(indice + 1), bairro: "Centro", cidade: "São Paulo" } : {},
    itens: [{ chaveItem: randomUUID(), tipo: "PRODUTO", idCadastro: catalogo.produtos[0].id, quantidade: 50 }], desconto: {},
  } });
  await consultar(`/${pedido.idPedido}/${status === "CANCELADO" ? "cancelamento" : "status"}`, { chaveOperacao: randomUUID(), revisao: pedido.revisao, ...(status !== "CANCELADO" && { status }) });
}
console.log("Sete pedidos fictícios preparados. Contadores esperados: 2, 1, 1, 1.");
