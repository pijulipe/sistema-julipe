import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

test("Pedidos com PostgreSQL descartável: migração, persistência e concorrência", { timeout: 120000 }, async (t) => {
  const raiz = resolve(".testes-pedidos");
  await mkdir(raiz, { recursive: true });
  const diretorio = await mkdtemp(resolve(raiz, "execucao-"));
  assert.ok(diretorio.startsWith(raiz + sep), "Cluster deve permanecer na pasta de testes.");
  const banco = new EmbeddedPostgres({ databaseDir: diretorio, user: "postgres", password: "teste-local-descartavel", port: 55439, persistent: false, postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
  let conexao;
  let cliente;
  try {
    await banco.initialise();
    await banco.start();
    conexao = banco.getPgClient();
    await conexao.connect();
    await conexao.query(await readFile("test/fixtures/schemaAnteriorPedidos.sql", "utf8"));
    await conexao.query("INSERT INTO pedidos(tipo_entrega) VALUES ('RETIRADA')");
    await conexao.query("BEGIN");
    await conexao.query(await readFile("../documentacao_bd/sql/2026-09-07_pedidos.sql", "utf8"));
    await conexao.query(await readFile("../documentacao_bd/sql/2026-09-07_pedidos_restricoes.sql", "utf8"));
    await conexao.query("COMMIT");
    process.env.DATABASE_URL = "postgresql://postgres:teste-local-descartavel@127.0.0.1:55439/postgres";
    process.env.JWT_SECRET = "segredo-local-exclusivo-dos-testes-de-pedidos-2026";
    process.env.SUPABASE_JWT_SECRET = "segredo-local-exclusivo-dos-testes-supabase-2026";
    process.env.SUPABASE_URL = "http://127.0.0.1:55440";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-local-de-testes-sem-nenhum-acesso-remoto-2026";
    process.env.NODE_ENV = "test";
    cliente = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    const { PedidoRepository } = await import("../src/repositories/pedidoRepository.js");
    const { PedidoService } = await import("../src/services/pedidoService.js");
    const { dadosPedido } = await import("../src/validators/pedidoValidator.js");
    const repository = new PedidoRepository(cliente);
    const servico = new PedidoService(repository);
    const drenarFila = async () => { let total = 0; while (await repository.processarFila(servico)) { if (++total > 100) throw new Error("Fila não esvaziou."); } return total; };
    const idUsuario = randomUUID();
    await cliente.usuario.create({ data: { idUsuario, nome: "Gerente de teste", email: "gerente@teste.invalid", idAutenticacaoSupabase: randomUUID(), perfilAcesso: "GERENTE" } });
    const gerente = { idUsuario, nome: "Gerente de teste", perfilAcesso: "GERENTE", permissoes: [], limiteDesconto: "0", limiteEstorno: "0", podeCancelarPedido: true };
    const atendente = { ...gerente, perfilAcesso: "ATENDENTE", permissoes: ["PEDIDOS"], podeCancelarPedido: false };
    const categoria = await cliente.categorias.create({ data: { nome_categoria: "Salgados" } });
    const produto = await cliente.produtos.create({ data: { id_categoria: categoria.id_categoria, nome: "Coxinha", preco_unitario: "20", multiplo_minimo: 25 } });
    const clienteVenda = await cliente.cliente.create({ data: { nome: "Cliente original", telefone: "11999999999" } });
    const combo = await cliente.combos.create({ data: { nome: "Combo teste", preco: "70", itens_combo: { create: { id_produto: produto.id_produto, quantidade: 50 } } } });
    await cliente.expedientePedido.createMany({ data: Array.from({ length: 7 }, (_, diaSemana) => ({ diaSemana, aberto: true, inicio: "08:00", fim: "18:00" })) });
    const dados = dadosPedido.parse({ idCliente: String(clienteVenda.idCliente), tipoEntrega: "ENTREGA", dataEntrega: "2099-01-05", horarioEntrega: "08:15", endereco: { rua: "Rua original", numero: "10", bairro: "Centro", cidade: "São Paulo" }, itens: [{ chaveItem: randomUUID(), tipo: "PRODUTO", idCadastro: String(produto.id_produto), quantidade: 50 }], desconto: {} });
    let pedido;
    const criar = (alteracoes = {}, usuario = gerente) => servico.executar("criar", undefined, { chaveOperacao: randomUUID(), dados: { ...dados, ...alteracoes } }, usuario);
    const operar = async (acao, campos = {}, usuario = gerente) => {
      const resultado = await servico.executar(acao, pedido.idPedido, { chaveOperacao: randomUUID(), revisao: pedido.revisao, ...campos }, usuario);
      pedido = resultado;
      return resultado;
    };
    await t.test("migração preserva legado sem inventar pagamentos", async () => {
      const legado = await servico.buscar("1", gerente);
      assert.equal(legado.legado, true);
      assert.equal(legado.financeiro, null);
      assert.equal(legado.pagamentos.length, 0);
    });
    await t.test("criação é persistida com preço por pacote e endereço histórico", async () => {
      pedido = await criar();
      assert.equal(pedido.fotografia.totalCentavos, "4000");
      await cliente.cliente.update({ where: { idCliente: clienteVenda.idCliente }, data: { nome: "Nome posterior", endereco: "Outra rua" } });
      const consultado = await servico.buscar(pedido.idPedido, gerente);
      assert.equal(consultado.fotografia.cliente.nome, "Cliente original");
      assert.equal(consultado.fotografia.endereco.rua, "Rua original");
      assert.equal(await cliente.pedidoVersao.count({ where: { idPedido: BigInt(pedido.idPedido) } }), 1);
    });
    await t.test("pagamentos rejeitados, parcial, excedente e estorno parcial", async () => {
      await operar("pagamento", { valor: "10", forma: "PIX", situacao: "REJEITADO", realizadoEm: new Date().toISOString() });
      assert.equal(pedido.financeiro.situacao, "PENDENTE");
      await operar("pagamento", { valor: "10", forma: "DEBITO", situacao: "CONFIRMADO", realizadoEm: new Date().toISOString() });
      assert.equal(pedido.financeiro.situacao, "PARCIAL");
      await operar("pagamento", { valor: "40", forma: "CREDITO", situacao: "CONFIRMADO", realizadoEm: new Date().toISOString() });
      assert.equal(pedido.financeiro.excedenteCentavos, "1000");
      const pagamento = pedido.pagamentos.find((p) => String(p.valorCentavos) === "4000");
      await operar("estorno", { idPagamento: pagamento.idPagamento, valor: "15" });
      assert.equal(pedido.financeiro.situacao, "PARCIAL");
      assert.equal(pedido.financeiro.liquidoCentavos, "3500");
    });
    await t.test("idempotência impede duplicar pagamento após resposta perdida", async () => {
      const corpo = { chaveOperacao: randomUUID(), revisao: pedido.revisao, valor: "1", forma: "PIX", situacao: "CONFIRMADO", realizadoEm: new Date().toISOString() };
      const primeiro = await servico.executar("pagamento", pedido.idPedido, corpo, gerente);
      const repetido = await servico.executar("pagamento", pedido.idPedido, corpo, gerente);
      assert.equal(primeiro.revisao, repetido.revisao);
      assert.equal(primeiro.pagamentos.length, repetido.pagamentos.length);
      await assert.rejects(servico.executar("pagamento", pedido.idPedido, { ...corpo, valor: "2" }, gerente), (e) => e.status === 409);
      pedido = primeiro;
    });
    await t.test("edições simultâneas não sobrescrevem silenciosamente", async () => {
      const revisao = pedido.revisao;
      const resultados = await Promise.allSettled(["A", "B"].map((observacoes) => servico.executar("editar", pedido.idPedido, { chaveOperacao: randomUUID(), revisao, dados: { ...dados, observacoes } }, gerente)));
      assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(resultados.find((r) => r.status === "rejected").reason.status, 409);
      pedido = await servico.buscar(pedido.idPedido, gerente);
    });
    await t.test("fila atualiza catálogo sem abrir tela e preserva pagamentos", async () => {
      await cliente.produtos.update({ where: { id_produto: produto.id_produto }, data: { preco_unitario: "30" } });
      assert.ok(await drenarFila() > 0);
      pedido = await servico.buscar(pedido.idPedido, gerente);
      assert.equal(pedido.fotografia.totalCentavos, "6000");
      assert.equal(pedido.financeiro.liquidoCentavos, "3600");
    });
    await t.test("novo múltiplo cria pendência sem ajustar quantidade e aceita correção manual", async () => {
      const versao = pedido.versao;
      await cliente.produtos.update({ where: { id_produto: produto.id_produto }, data: { multiplo_minimo: 30 } });
      await drenarFila();
      pedido = await servico.buscar(pedido.idPedido, gerente);
      assert.equal(pedido.versao, versao);
      assert.equal(pedido.fotografia.itens[0].quantidade, 50);
      assert.ok(pedido.pendencia.impedimentos.length);
      await operar("editar", { dados: { ...dados, itens: [{ ...dados.itens[0], quantidade: 60 }] } });
      assert.equal(pedido.fotografia.itens[0].quantidade, 60);
    });
    await t.test("desconto exige aprovação vinculada à proposta e rejeita catálogo obsoleto", async () => {
      await operar("editar", { dados: { ...dados, itens: [{ ...dados.itens[0], quantidade: 60 }], desconto: { percentual: "10", valorFixo: "0", ordem: "PERCENTUAL_PRIMEIRO", motivo: "teste" } } }, atendente);
      assert.equal(pedido.fotografia.totalCentavos, "6000");
      const assinatura = pedido.pendencia.assinatura;
      await cliente.produtos.update({ where: { id_produto: produto.id_produto }, data: { preco_unitario: "40" } });
      await assert.rejects(operar("autorizar", { assinatura }), (e) => e.status === 409);
      await drenarFila();
      pedido = await servico.buscar(pedido.idPedido, gerente);
      await operar("autorizar", { assinatura: pedido.pendencia.assinatura });
      assert.equal(pedido.fotografia.totalCentavos, "7200");
    });
    await t.test("exclusão conserva itens e preço da versão vigente", async () => {
      await cliente.produtos.update({ where: { id_produto: produto.id_produto }, data: { item_ativo: false, ativo: false, deletado_em: new Date() } });
      await drenarFila();
      pedido = await servico.buscar(pedido.idPedido, gerente);
      assert.equal(pedido.fotografia.totalCentavos, "7200");
      assert.equal(pedido.fotografia.itens.length, 1);
      await assert.rejects(criar(), /excluído/);
    });
    await t.test("cancelamento exige capacidade, preserva financeiro e gerente reabre", async () => {
      await assert.rejects(operar("cancelar", {}, atendente), (e) => e.status === 403);
      await operar("cancelar", { motivo: "Teste" });
      assert.equal(pedido.financeiro.liquidoCentavos, "3600");
      await assert.rejects(operar("editar", { dados }), (e) => e.status === 409);
      await assert.rejects(operar("reabrir", {}, atendente), (e) => e.status === 403);
    });
    await t.test("gatilho e bloqueio impedem estornos concorrentes acima do saldo", async () => {
      const pagamento = pedido.pagamentos.find((p) => String(p.valorCentavos) === "4000");
      const revisao = pedido.revisao;
      const resultados = await Promise.allSettled([1, 2].map(() => servico.executar("estorno", pedido.idPedido, { chaveOperacao: randomUUID(), revisao, idPagamento: pagamento.idPagamento, valor: "20" }, gerente)));
      assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
      const soma = await cliente.estornoPedido.aggregate({ where: { idPagamento: pagamento.idPagamento }, _sum: { valorCentavos: true } });
      assert.equal(soma._sum.valorCentavos, 3500n);
      pedido = await servico.buscar(pedido.idPedido, gerente);
    });
    await t.test("combo usa preço próprio e preserva composição vendida", async () => {
      await cliente.produtos.update({ where: { id_produto: produto.id_produto }, data: { ativo: true, item_ativo: true, deletado_em: null, multiplo_minimo: 25 } });
      const venda = await criar({ itens: [{ chaveItem: randomUUID(), tipo: "COMBO", idCadastro: String(combo.id_combo), quantidade: 2, observacoes: "", foto: null }] });
      assert.equal(venda.fotografia.totalCentavos, "14000");
      assert.equal(venda.fotografia.itens[0].composicao[0].quantidade, 50);
      const indicadores = await servico.indicadores({});
      assert.equal(indicadores.faturamentoCentavos, 14000n);
      const pagina = await servico.listar({ pagina: 1, limite: 1 }, gerente);
      assert.equal(pagina.dados.length, 1);
      assert.equal(pagina.paginacao.total, 3);
    });
    await t.test("gerente reabre, preserva versões e estorno integral resulta em pendente", async () => {
      await operar("reabrir", { dados: { ...dados, desconto: { percentual: "0", valorFixo: "0", ordem: "PERCENTUAL_PRIMEIRO" } } });
      assert.equal(pedido.status, "EM_PRODUCAO");
      assert.equal(pedido.fotografia.totalCentavos, "8000");
      for (const pagamento of pedido.pagamentos.filter((p) => p.situacao === "CONFIRMADO")) {
        const devolvido = pagamento.estornos.reduce((s, e) => s + BigInt(e.valorCentavos), 0n);
        const saldo = BigInt(pagamento.valorCentavos) - devolvido;
        await operar("estorno", { idPagamento: pagamento.idPagamento, valor: `${saldo / 100n}.${String(saldo % 100n).padStart(2, "0")}` });
      }
      assert.equal(pedido.financeiro.situacao, "PENDENTE");
      assert.equal(pedido.financeiro.liquidoCentavos, "0");
      assert.ok(pedido.pagamentos.filter((p) => p.situacao !== "REJEITADO").every((p) => p.situacao === "ESTORNADO"));
      const versao = pedido.versao;
      await operar("status", { status: "ENTREGUE" });
      const fotografia = pedido.fotografia;
      await cliente.produtos.update({ where: { id_produto: produto.id_produto }, data: { preco_unitario: "45" } });
      await drenarFila();
      pedido = await servico.buscar(pedido.idPedido, gerente);
      assert.deepEqual(pedido.fotografia, fotografia);
      assert.equal(pedido.versao, versao);
      assert.ok(await cliente.pedidoVersao.count({ where: { idPedido: BigInt(pedido.idPedido) } }) > 1);
    });
    await t.test("item novo excluído na proposta gera pendência sem interromper a fila", async () => {
      const aberto = await criar();
      const adicional = await cliente.produtos.create({ data: { id_categoria: categoria.id_categoria, nome: "Adicional", preco_unitario: "10", multiplo_minimo: 1 } });
      const proposta = { ...dados, itens: [...dados.itens, { chaveItem: randomUUID(), tipo: "PRODUTO", idCadastro: String(adicional.id_produto), quantidade: 1, observacoes: "", foto: null }], desconto: { percentual: "10", valorFixo: "0", ordem: "PERCENTUAL_PRIMEIRO" } };
      await servico.executar("editar", aberto.idPedido, { chaveOperacao: randomUUID(), revisao: aberto.revisao, dados: proposta }, atendente);
      await cliente.produtos.update({ where: { id_produto: adicional.id_produto }, data: { item_ativo: false, deletado_em: new Date() } });
      await drenarFila();
      const revisado = await servico.buscar(aberto.idPedido, gerente);
      assert.ok(revisado.pendencia.impedimentos.some((i) => i.mensagem.includes("excluído")));
      assert.deepEqual(revisado.fotografia, aberto.fotografia);
    });
    await t.test("prévia não grava e a revogação impede repetir resposta idempotente", async () => {
      const antes = await cliente.pedidos.count();
      const previa = await servico.previa({ dados }, atendente);
      assert.equal(previa.fotografia.totalCentavos, "9000");
      assert.equal(await cliente.pedidos.count(), antes);
      const corpo = { chaveOperacao: randomUUID(), dados };
      await servico.executar("criar", undefined, corpo, atendente);
      await assert.rejects(servico.executar("criar", undefined, corpo, { ...atendente, permissoes: [] }), (e) => e.status === 403);
    });
    await t.test("script de criação completa executa em banco vazio", async () => {
      await conexao.query("CREATE DATABASE julipe_criacao");
      const criacao = banco.getPgClient("julipe_criacao");
      await criacao.connect();
      try {
        await criacao.query(await readFile("../documentacao_bd/sql/2026-09-08_criacao_completa.sql", "utf8"));
        const resultado = await criacao.query("SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
        assert.ok(resultado.rows[0].total >= 20);
      } finally { await criacao.end(); }
    });
    await t.test("API recarrega permissões e separa Produção, venda e configuração", async () => {
      const { app } = await import("../src/app.js");
      const { prisma } = await import("../src/database/prisma.js");
      const servidor = await new Promise((resolver) => { const instancia = app.listen(0, "127.0.0.1", () => resolver(instancia)); });
      const idOperador = randomUUID();
      await cliente.usuario.create({ data: { idUsuario: idOperador, nome: "Produção de teste", email: "producao@teste.invalid", idAutenticacaoSupabase: randomUUID(), perfilAcesso: "ATENDENTE", permissoesFuncionario: { create: { modulo: "PRODUCAO" } } } });
      const token = jwt.sign({ sub: idOperador, perfilAcesso: "GERENTE", permissoes: ["PEDIDOS"] }, process.env.JWT_SECRET, { expiresIn: "1h" });
      const consultar = (caminho, corpo, credencial = token) => fetch(`http://127.0.0.1:${servidor.address().port}/api${caminho}`, { method: corpo ? "POST" : "GET", headers: { Authorization: `Bearer ${credencial}`, "Content-Type": "application/json" }, ...(corpo && { body: JSON.stringify(corpo) }) });
      try {
        const aberto = await criar();
        assert.equal((await consultar("/pedidos/painel")).status, 200);
        assert.equal((await consultar("/pedidos/venda")).status, 403);
        assert.equal((await consultar("/configuracoes-pedidos")).status, 403);
        const resposta = await consultar(`/pedidos/${aberto.idPedido}/status`, { chaveOperacao: randomUUID(), revisao: aberto.revisao, status: "EM_PRODUCAO" });
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.json()).dados.status, "EM_PRODUCAO");
        await cliente.permissaoFuncionario.updateMany({ where: { idUsuario: idOperador }, data: { itemAtivo: false } });
        assert.equal((await consultar("/pedidos/painel")).status, 403);
        assert.equal((await consultar("/pedidos/indicadores")).status, 200);
        const tokenGerente = jwt.sign({ sub: idUsuario, perfilAcesso: "GERENTE" }, process.env.JWT_SECRET, { expiresIn: "1h" });
        assert.equal((await consultar("/pedidos", { chaveOperacao: randomUUID(), dados: { ...dados, itens: [] } }, tokenGerente)).status, 422);
        assert.equal((await consultar(`/pedidos/${aberto.idPedido}/fotos?versao=1`, undefined, tokenGerente)).status, 200);
        assert.equal((await consultar("/pedidos", undefined, "invalido")).status, 401);
      } finally {
        await new Promise((resolver) => servidor.close(resolver));
        await prisma.$disconnect();
      }
    });
    await t.test("autorização inicial vincula gerente, solicitante, valores e chave da operação", async () => {
      const { AutorizacaoPedidoService } = await import("../src/services/autorizacaoPedidoService.js");
      const autorizacoes = new AutorizacaoPedidoService(process.env.JWT_SECRET);
      const usuarios = { buscarAcessoAtualPorId: async () => gerente };
      const autorizado = new PedidoService(repository, autorizacoes, usuarios);
      const proposta = { ...dados, desconto: { percentual: "10", valorFixo: "0", ordem: "PERCENTUAL_PRIMEIRO" } };
      // O autor desta venda é avaliado com limite zero; gerente aprova somente esta proposta.
      usuarios.buscarAcessoAtualPorId = async (id) => id === "solicitante" ? atendente : gerente;
      const chaveOperacao = randomUUID();
      const { assinaturaPedido } = await import("../src/services/pedidoService.js");
      const previa = await autorizado.preparar(repository, proposta, atendente);
      const autorizacao = autorizacoes.emitir({ idSolicitante: atendente.idUsuario, idGerente: gerente.idUsuario, nomeGerente: gerente.nome, assinatura: assinaturaPedido({ proposta: previa.assinatura, chaveOperacao }) });
      const corpo = { chaveOperacao, dados: proposta, autorizacao };
      const venda = await autorizado.executar("criar", undefined, corpo, atendente);
      assert.equal(venda.fotografia.totalCentavos, "8100");
      await assert.rejects(autorizado.executar("criar", undefined, { ...corpo, chaveOperacao: randomUUID() }, atendente), (e) => e.status === 409);
      assert.ok((await repository.historico(venda.idPedido)).some((evento) => evento.acao === "AUTORIZACAO_DESCONTO"));
    });
  } finally {
    await cliente?.$disconnect();
    await conexao?.end();
    await banco.stop();
  }
});
