import { prisma } from "../database/prisma.js";
import { ErroAplicacao } from "../utils/erroAplicacao.js";

export const serializarPedido = (valor) => JSON.parse(JSON.stringify(valor, (_, item) => typeof item === "bigint" ? String(item) : item));
const incluir = { pagamentosVenda: { include: { estornos: true }, orderBy: { realizadoEm: "asc" } } };

export class PedidoRepository {
  constructor(conexao = prisma, transacional = false) { this.conexao = conexao; this.transacional = transacional; }
  async transacao(operacao) {
    try {
      return await this.conexao.$transaction((conexao) => operacao(new PedidoRepository(conexao, true)), { isolationLevel: "Serializable", timeout: 15000 });
    } catch (erro) {
      if (["P2034", "P2002"].includes(erro.code)) throw new ErroAplicacao("Conflito concorrente. Recarregue e repita a operação com a mesma chave.", 409);
      throw erro;
    }
  }
  async bloquear(id) { await this.conexao.$queryRaw`SELECT id_pedido FROM pedidos WHERE id_pedido = ${BigInt(id)} FOR UPDATE`; }
  async buscar(id) { return this.conexao.pedidos.findUnique({ where: { id_pedido: BigInt(id) }, include: incluir }); }
  async operacao(chave) { return this.conexao.operacaoPedido.findUnique({ where: { chave } }); }
  async registrarOperacao(chave, assinatura, resposta) { return this.conexao.operacaoPedido.create({ data: { chave, assinatura, resposta: serializarPedido(resposta) } }); }
  async cliente(id) { return this.conexao.cliente.findFirst({ where: { idCliente: BigInt(id), itemAtivo: true, deletadoEm: null } }); }
  async catalogo() {
    if (this.catalogoCache) return this.catalogoCache;
    const [produtos, combos] = await Promise.all([
      this.conexao.produtos.findMany({ include: { categorias: true } }), this.conexao.combos.findMany({ include: { itens_combo: { include: { produtos: { include: { categorias: true } } } } } }),
    ]);
    const catalogo = {
      produtos: produtos.map((p) => ({ id: String(p.id_produto), nome: p.nome, preco: String(p.preco_unitario), multiploMinimo: p.multiplo_minimo, idCategoria: String(p.id_categoria), nomeCategoria: p.categorias.nome_categoria, ativo: p.ativo, excluido: !p.item_ativo || Boolean(p.deletado_em) })),
      combos: combos.map((c) => ({ id: String(c.id_combo), nome: c.nome, preco: String(c.preco), versao: c.versao, ativo: c.ativo, excluido: !c.item_ativo || Boolean(c.deletado_em), composicao: c.itens_combo.map((i) => ({ idProduto: String(i.id_produto), nome: i.produtos.nome, idCategoria: String(i.produtos.id_categoria), categoria: i.produtos.categorias.nome_categoria, quantidade: Number(i.quantidade), multiploMinimo: i.produtos.multiplo_minimo, ativo: i.produtos.ativo, excluido: !i.produtos.item_ativo || Boolean(i.produtos.deletado_em) })) })),
    };
    if (this.transacional) this.catalogoCache = catalogo;
    return catalogo;
  }
  async expediente() { return this.conexao.expedientePedido.findMany(); }
  async capacidade() { return this.conexao.capacidadeCategoria.findMany(); }
  async criar(campos) { return this.conexao.pedidos.create({ data: campos, include: incluir }); }
  async atualizar(id, campos) { return this.conexao.pedidos.update({ where: { id_pedido: BigInt(id) }, data: campos, include: incluir }); }
  async versao(id, versao, fotografia) { return this.conexao.pedidoVersao.create({ data: { idPedido: BigInt(id), versao, fotografia: serializarPedido(fotografia) } }); }
  async buscarVersao(id, versao) { return this.conexao.pedidoVersao.findUnique({ where: { idPedido_versao: { idPedido: BigInt(id), versao } } }); }
  async evento(id, versao, acao, autor, dados) {
    return this.conexao.eventoPedido.create({ data: { idPedido: BigInt(id), versao, acao, idAutor: autor.idUsuario || null, nomeAutor: autor.nome || "Atualização do catálogo", dados: serializarPedido(dados) } });
  }
  async pagamento(id, dados) { return this.conexao.pagamentoPedido.create({ data: { idPedido: BigInt(id), ...dados } }); }
  async estorno(dados) { return this.conexao.estornoPedido.create({ data: dados }); }
  async historico(id, pagina = 1) {
    return this.conexao.eventoPedido.findMany({ where: { idPedido: BigInt(id) }, orderBy: { idEvento: "desc" }, take: 50, skip: (pagina - 1) * 50 });
  }
  filtro({ busca, status, dataInicio, dataFim } = {}) {
    return { item_ativo: true, deletado_em: null, ...(status && { status_pedido: status }),
      ...(busca && { OR: [{ codigo_comanda: { contains: busca, mode: "insensitive" } }, { clientes: { nome: { contains: busca, mode: "insensitive" } } }] }),
      ...((dataInicio || dataFim) && { data_entrega_agendada: { ...(dataInicio && { gte: new Date(`${dataInicio}T00:00:00Z`) }), ...(dataFim && { lte: new Date(`${dataFim}T00:00:00Z`) }) } }),
    };
  }
  async listar(consulta) {
    const where = this.filtro(consulta);
    const [dados, total] = await Promise.all([
      this.conexao.pedidos.findMany({ where, include: incluir, orderBy: { id_pedido: "desc" }, take: consulta.limite, skip: (consulta.pagina - 1) * consulta.limite }),
      this.conexao.pedidos.count({ where }),
    ]);
    return { dados, paginacao: { pagina: consulta.pagina, limite: consulta.limite, total, totalPaginas: Math.ceil(total / consulta.limite) } };
  }
  async todos(consulta = {}) { return this.conexao.pedidos.findMany({ where: this.filtro(consulta), include: incluir }); }
  async clientesVenda(busca) { return this.conexao.cliente.findMany({ where: { itemAtivo: true, deletadoEm: null, OR: [{ nome: { contains: busca, mode: "insensitive" } }, { telefone: { contains: busca } }] }, take: 50, orderBy: { nome: "asc" } }); }
  async foto(caminho) {
    if (this.transacional) await this.conexao.$queryRaw`SELECT caminho FROM fotos_pedido WHERE caminho = ${caminho} FOR KEY SHARE`;
    return this.conexao.fotoPedido.findUnique({ where: { caminho } });
  }
  async processarFila(servico) {
    return this.transacao(async (repository) => {
      const eventos = await repository.conexao.$queryRaw`SELECT * FROM alteracoes_catalogo_pedidos ORDER BY id_alteracao LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!eventos.length) return 0;
      const evento = eventos[0];
      const pedidos = await repository.conexao.$queryRaw`
        SELECT p.id_pedido FROM pedidos p WHERE p.id_pedido > ${evento.ultimo_pedido}
          AND p.status_pedido NOT IN ('ENTREGUE','CANCELADO') AND p.versao_vigente > 0
          AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p.fotografia->'itens', '[]'::jsonb) || COALESCE(p.pendencia->'fotografia'->'itens', '[]'::jsonb) || COALESCE(p.pendencia->'dados'->'itens', '[]'::jsonb)) i
            WHERE (i->>'tipo' = ${evento.entidade} AND i->>'idCadastro' = ${String(evento.id_cadastro)})
            OR (${evento.entidade} = 'PRODUTO' AND EXISTS (SELECT 1 FROM jsonb_array_elements(i->'composicao') c WHERE c->>'idProduto' = ${String(evento.id_cadastro)})))
        ORDER BY p.id_pedido LIMIT 50 FOR UPDATE OF p`;
      for (const { id_pedido } of pedidos) {
        await servico.sincronizar(repository, await repository.buscar(id_pedido));
      }
      if (pedidos.length < 50) await repository.conexao.alteracaoCatalogoPedido.delete({ where: { idAlteracao: evento.id_alteracao } });
      else await repository.conexao.alteracaoCatalogoPedido.update({ where: { idAlteracao: evento.id_alteracao }, data: { ultimoPedido: pedidos.at(-1).id_pedido } });
      return 1;
    });
  }
}
