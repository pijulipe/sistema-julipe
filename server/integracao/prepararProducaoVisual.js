// Dados fictícios exclusivos do ambienteVisual.js, sem ler .env ou acessar banco remoto.
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
const banco = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:teste-local-descartavel@127.0.0.1:55439/postgres" } } });
try {
  const autenticacao = await fetch("http://127.0.0.1:55440/auth/v1/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "gerente@teste.invalid", password: "Teste-local-2026!" }) }).then((resposta) => resposta.json());
  const sessao = await fetch("http://127.0.0.1:3334/api/autenticacao/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenSupabase: autenticacao.access_token }) }).then((resposta) => resposta.json());
  const token = sessao.dados?.token;
  if (!token) throw new Error("Não foi possível iniciar a sessão de testes.");
  const consultar = async (caminho, corpo, metodo) => {
    const resposta = await fetch(`http://127.0.0.1:3334/api/pedidos${caminho}`, { method: metodo || (corpo ? "POST" : "GET"), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(corpo && { body: JSON.stringify(corpo) }) });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.mensagem);
    return resultado.dados;
  };
  if (process.argv[2] === "alterar") {
    const pedido = await consultar("/2");
    const { idCliente, codigoComanda, tipoEntrega, dataEntrega, horarioEntrega, endereco, observacoes, detalhesPersonalizacao, desconto, itens } = pedido.fotografia;
    const dados = { idCliente, codigoComanda, tipoEntrega, dataEntrega, horarioEntrega, endereco, observacoes: `${observacoes} Revisão de teste ${pedido.revisao}.`, detalhesPersonalizacao, desconto, itens: itens.map(({ chaveItem, tipo, idCadastro, quantidade, observacoes, foto }) => ({ chaveItem, tipo, idCadastro, quantidade, observacoes, foto })) };
    await consultar("/2", { chaveOperacao: randomUUID(), revisao: pedido.revisao, dados }, "PUT");
    console.log("Alteração concorrente fictícia registrada no pedido 2.");
  } else {
  const catalogo = await consultar("/venda");
  const acesso = await consultar("/acesso");
  const foto = `referencias/${randomUUID()}.png`;
  await banco.fotoPedido.create({ data: { caminho: foto, idAutor: acesso.idUsuario, confirmada: true } });
  const produto = catalogo.produtos.find((item) => item.nome === "Coxinha");
  const combo = await banco.combos.create({ data: { nome: `Festa de teste ${randomUUID().slice(0, 4)}`, preco: "70", itens_combo: { create: { id_produto: Number(produto.id), quantidade: 50 } } } });
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const anterior = new Date(`${hoje}T12:00:00Z`); anterior.setUTCDate(anterior.getUTCDate() - 1);
  for (const [indice, status] of ["RECEBIDO", "EM_PRODUCAO", "PRONTO", "EM_ROTA", "ENTREGUE", "CANCELADO"].entries()) {
    let pedido = await consultar("", { chaveOperacao: randomUUID(), dados: {
      idCliente: catalogo.clientes[0].idCliente, tipoEntrega: "RETIRADA", endereco: {}, dataEntrega: hoje, horarioEntrega: `${14 + indice % 3}:00`,
      observacoes: "Separar embalagem. Sem amendoim.", detalhesPersonalizacao: "Decoração azul e nome Ana.",
      itens: [{ chaveItem: randomUUID(), tipo: "PRODUTO", idCadastro: produto.id, quantidade: 50, observacoes: "Assar bem.", foto }, { chaveItem: randomUUID(), tipo: "COMBO", idCadastro: String(combo.id_combo), quantidade: 2, observacoes: "Separar em duas caixas." }], desconto: {},
    } });
    if (status !== "RECEBIDO") pedido = await consultar(`/${pedido.idPedido}/${status === "CANCELADO" ? "cancelamento" : "status"}`, { chaveOperacao: randomUUID(), revisao: pedido.revisao, ...(status !== "CANCELADO" && { status }) });
    // Simula a passagem do dia no banco descartável; não altera a validação de agendamento.
    if (indice === 0) {
      const fotografia = { ...pedido.fotografia, dataEntrega: anterior.toISOString().slice(0, 10) };
      await banco.pedidos.update({ where: { id_pedido: BigInt(pedido.idPedido) }, data: { fotografia, data_entrega_agendada: new Date(`${fotografia.dataEntrega}T00:00:00Z`) } });
      await banco.pedidoVersao.update({ where: { idPedido_versao: { idPedido: BigInt(pedido.idPedido), versao: pedido.versao } }, data: { fotografia } });
    }
  }
  console.log("Seis pedidos fictícios preparados; três pertencem ao painel de Produção.");
  }
} finally { await banco.$disconnect(); }
