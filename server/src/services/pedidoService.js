import { createHash } from "node:crypto";
import { ErroAplicacao } from "../utils/erroAplicacao.js";
import { exigirModuloPedido, possuiModulo, autorizarStatus } from "../utils/acessoPedido.js";
import { calcularItem, calcularDesconto, calcularFinanceiro, calcularCapacidade, exigeAutorizacao, paraCentavos, decimalMonetario, validarEstorno } from "./calculoPedido.js";
import { validarAgendamento } from "./agendamentoPedido.js";

function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === "object") return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, canonico(valor[chave])]));
  return typeof valor === "bigint" ? String(valor) : valor;
}
export const assinaturaPedido = (valor) => createHash("sha256").update(JSON.stringify(canonico(valor))).digest("hex");
const fechado = (pedido) => ["ENTREGUE", "CANCELADO"].includes(pedido.status_pedido);
const origem = (item) => `${item.tipo}:${item.idCadastro}`;
function camposComerciais(fotografia) {
  if (!fotografia) return null;
  const { avisos, limiteDescontoOriginal, ...campos } = fotografia;
  return { ...campos, itens: campos.itens.map((item) => ({ ...item, composicao: item.composicao.map(({ ativo, excluido, ...componente }) => componente) })) };
}

export class PedidoService {
  constructor(repository, autorizacoes = null, usuarios = null) { this.repository = repository; this.autorizacoes = autorizacoes; this.usuarios = usuarios; }
  exigirLeitura(usuario) {
    if (!["PEDIDOS", "PRODUCAO", "EXPEDICAO", "RELATORIO"].some((m) => possuiModulo(usuario, m))) throw new ErroAplicacao("Consulta de pedidos não autorizada.", 403);
  }
  apresentar(pedido) {
    return {
      idPedido: String(pedido.id_pedido), revisao: pedido.revisao, versao: pedido.versao_vigente,
      status: pedido.status_pedido, criadoEm: pedido.data_pedido,
      legado: !pedido.fotografia, fotografia: pedido.fotografia, pendencia: pedido.pendencia,
      pagamentos: (pedido.pagamentosVenda || []).map((pagamento) => ({ ...pagamento,
        situacao: pagamento.situacao !== "REJEITADO" && (pagamento.estornos || []).reduce((soma, e) => soma + BigInt(e.valorCentavos), 0n) === BigInt(pagamento.valorCentavos) ? "ESTORNADO" : pagamento.situacao,
      })),
      financeiro: pedido.fotografia ? calcularFinanceiro(pedido.fotografia.totalCentavos, pedido.pagamentosVenda || []) : null,
    };
  }
  async obter(repository, id) {
    const pedido = await repository.buscar(id);
    if (!pedido || !pedido.item_ativo || pedido.deletado_em) throw new ErroAplicacao("Pedido não encontrado.", 404);
    return pedido;
  }
  async buscar(id, usuario) { this.exigirLeitura(usuario); return this.apresentar(await this.obter(this.repository, id)); }
  async painel(usuario) {
    this.exigirLeitura(usuario);
    return this.repository.transacao(async (repository) => (await repository.todos()).map((pedido) => this.apresentar(pedido)));
  }
  async venda(busca, usuario) {
    exigirModuloPedido(usuario);
    const catalogo = await this.repository.catalogo();
    return { produtos: catalogo.produtos.filter((p) => p.ativo && !p.excluido), combos: catalogo.combos.filter((c) => c.ativo && !c.excluido), clientes: await this.repository.clientesVenda(busca) };
  }
  async autorizarNovo({ idSolicitante, chaveOperacao, dados }, usuario) {
    if (usuario.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Somente gerente autoriza desconto.", 403);
    const solicitante = await this.usuarios.buscarAcessoAtualPorId(idSolicitante);
    if (!solicitante) throw new ErroAplicacao("Solicitante não encontrado.", 404);
    exigirModuloPedido(solicitante);
    const proposta = await this.repository.transacao((repository) => this.preparar(repository, dados, solicitante));
    if (proposta.impedimentos.some((i) => i.codigo !== "AUTORIZACAO")) throw new ErroAplicacao("Corrija os itens antes de autorizar.", 422, proposta.impedimentos);
    return { autorizacao: this.autorizacoes.emitir({ idSolicitante, assinatura: assinaturaPedido({ proposta: proposta.assinatura, chaveOperacao }), idGerente: usuario.idUsuario, nomeGerente: usuario.nome }) };
  }
  async historico(id, pagina, usuario) { await this.buscar(id, usuario); return this.repository.historico(id, pagina); }
  async fotografiaVersao(id, versao, usuario) {
    const pedido = await this.buscar(id, usuario);
    if (!versao) return pedido.fotografia;
    const registro = await this.repository.buscarVersao(id, versao);
    if (!registro) throw new ErroAplicacao("Versão não encontrada.", 404);
    return registro.fotografia;
  }
  async previa({ dados, idPedido }, usuario) {
    exigirModuloPedido(usuario);
    return this.repository.transacao(async (repository) => {
      const anterior = idPedido ? (await this.obter(repository, idPedido)).fotografia : null;
      const proposta = await this.preparar(repository, dados, usuario, anterior);
      return { fotografia: proposta.fotografia, impedimentos: proposta.impedimentos };
    });
  }
  async listar(consulta, usuario) {
    this.exigirLeitura(usuario);
    const resultado = await this.repository.listar(consulta);
    return { ...resultado, dados: resultado.dados.map((p) => this.apresentar(p)) };
  }
  async preparar(repository, dados, usuario, anterior = null, automatico = false) {
    const catalogo = await repository.catalogo();
    const avisos = [];
    const itens = [];
    const impedimentos = [];
    const referencias = [];
    for (const item of dados.itens) {
      const cadastro = catalogo[item.tipo === "PRODUTO" ? "produtos" : "combos"].find((c) => c.id === item.idCadastro);
      const existente = anterior?.itens.find((i) => i.chaveItem === item.chaveItem && origem(i) === origem(item));
      referencias.push({ chaveItem: item.chaveItem, cadastro });
      if (item.foto && item.foto !== existente?.foto) {
        const foto = await repository.foto(item.foto);
        if (!foto?.confirmada || foto.idAutor !== usuario.idUsuario) throw new ErroAplicacao("Foto não confirmada ou não pertence ao usuário.", 422);
      }
      if (!cadastro || cadastro.excluido) {
        if (!existente) {
          if (!automatico) throw new ErroAplicacao("Cadastro excluído não pode ser incluído.", 422);
          impedimentos.push({ chaveItem: item.chaveItem, mensagem: "Remova da proposta o cadastro excluído." });
          continue;
        }
        avisos.push({ chaveItem: item.chaveItem, mensagem: "Cadastro excluído." });
        // Exclusão isolada preserva preço, composição e quantidade da versão válida.
        if (item.quantidade === existente.quantidade) { itens.push({ ...existente, observacoes: item.observacoes, foto: item.foto }); continue; }
        try { itens.push(calcularItem(item, { nome: existente.nome, preco: decimalMonetario(existente.precoPacoteCentavos), multiploMinimo: existente.multiploMinimo, composicao: existente.composicao, id: item.idCadastro, idCategoria: existente.composicao[0]?.idCategoria })); }
        catch (erro) { if (!(erro instanceof ErroAplicacao)) throw erro; impedimentos.push({ chaveItem: item.chaveItem, mensagem: erro.message }); }
        continue;
      }
      if (!cadastro.ativo) {
        if (!existente) {
          if (!automatico) throw new ErroAplicacao("Item inativo não pode ser incluído.", 422);
          impedimentos.push({ chaveItem: item.chaveItem, mensagem: "Remova da proposta o item inativo." });
          continue;
        }
        avisos.push({ chaveItem: item.chaveItem, mensagem: "Cadastro inativo." });
      }
      if (item.tipo === "COMBO" && cadastro.composicao.some((p) => !p.ativo || p.excluido || !Number.isSafeInteger(p.quantidade) || p.quantidade <= 0 || p.quantidade % p.multiploMinimo !== 0)) {
        if (!existente) {
          if (!automatico) throw new ErroAplicacao("Combo possui composição indisponível para venda.", 422);
          impedimentos.push({ chaveItem: item.chaveItem, mensagem: "Corrija o combo indisponível na proposta." });
          continue;
        }
        avisos.push({ chaveItem: item.chaveItem, mensagem: "Composição do combo contém cadastro indisponível ou quantidade incompatível." });
        if (cadastro.composicao.some((p) => !Number.isSafeInteger(p.quantidade) || p.quantidade <= 0 || p.quantidade % p.multiploMinimo !== 0)) impedimentos.push({ chaveItem: item.chaveItem, mensagem: "Corrija manualmente a composição do combo para respeitar os múltiplos vigentes." });
      }
      try { itens.push(calcularItem(item, cadastro)); }
      catch (erro) { if (!(erro instanceof ErroAplicacao)) throw erro; impedimentos.push({ chaveItem: item.chaveItem, mensagem: erro.message }); }
    }
    let calculo;
    try { calculo = calcularDesconto(itens.reduce((s, i) => s + BigInt(i.subtotalCentavos), 0n), dados.desconto); }
    catch (erro) { if (!(erro instanceof ErroAplicacao)) throw erro; impedimentos.push({ mensagem: erro.message }); }
    const assinaturaCatalogo = assinaturaPedido(referencias);
    const fotografia = { ...dados, cliente: anterior?.cliente, itens, ...calculo, avisos, limiteDescontoOriginal: usuario.limiteDesconto ?? "0" };
    if (!automatico && (!anterior || dados.dataEntrega !== anterior.dataEntrega || dados.horarioEntrega !== anterior.horarioEntrega)) {
      validarAgendamento(dados.dataEntrega, dados.horarioEntrega, await repository.expediente());
    }
    if (!anterior || dados.idCliente !== anterior.idCliente) {
      const cliente = await repository.cliente(dados.idCliente);
      if (!cliente) throw new ErroAplicacao("Cliente não encontrado.", 422);
      fotografia.cliente = { idCliente: String(cliente.idCliente), nome: cliente.nome, telefone: cliente.telefone };
    }
    const mudouNegocio = assinaturaPedido(camposComerciais(fotografia)) !== assinaturaPedido(camposComerciais(anterior));
    const precisaAutorizacao = calculo && (!automatico || mudouNegocio) && usuario.perfilAcesso !== "GERENTE" && exigeAutorizacao(calculo, usuario.limiteDesconto);
    if (precisaAutorizacao) impedimentos.push({ codigo: "AUTORIZACAO", mensagem: "Sem autorização. Consulte o gerente." });
    return { dados, fotografia, impedimentos, idSolicitante: usuario.idUsuario || null, assinaturaCatalogo, assinatura: assinaturaPedido({ dados, assinaturaCatalogo, limite: usuario.limiteDesconto ?? "0" }) };
  }
  camposFotografia(fotografia) {
    return { fotografia, id_cliente: BigInt(fotografia.idCliente), tipo_entrega: fotografia.tipoEntrega,
      codigo_comanda: fotografia.codigoComanda, data_entrega_agendada: new Date(`${fotografia.dataEntrega}T00:00:00Z`),
      horario_entrega_agendada: new Date(`1970-01-01T${fotografia.horarioEntrega}:00Z`),
      valor_subtotal: decimalMonetario(fotografia.subtotalCentavos), valor_total: decimalMonetario(fotografia.totalCentavos),
      valor_desconto: decimalMonetario(fotografia.descontoCentavos), desconto_percentual: fotografia.desconto.percentual,
      observacoes_pedido: fotografia.observacoes, detalhes_personalizacao: fotografia.detalhesPersonalizacao,
    };
  }
  async executar(acao, id, corpo, usuario) {
    if (["criar", "editar", "pagamento", "estorno"].includes(acao)) exigirModuloPedido(usuario);
    if (["reabrir", "autorizar"].includes(acao) && usuario.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Ação exclusiva do gerente.", 403);
    if (["status", "cancelar"].includes(acao)) autorizarStatus(usuario, "RECEBIDO", acao === "cancelar" ? "CANCELADO" : corpo.status);
    const chave = `${usuario.idUsuario}:${corpo.chaveOperacao}`;
    const assinatura = assinaturaPedido({ acao, id, corpo });
    return this.repository.transacao(async (repository) => {
      const repeticao = await repository.operacao(chave);
      if (repeticao) {
        if (repeticao.assinatura !== assinatura) throw new ErroAplicacao("Chave de operação já utilizada com outros dados.", 409);
        return repeticao.resposta;
      }
      if (id) await repository.bloquear(id);
      const pedido = id ? await this.obter(repository, id) : null;
      if (pedido && corpo.revisao !== pedido.revisao) throw new ErroAplicacao("Pedido alterado. Recarregue antes de continuar.", 409);
      if (pedido && !pedido.fotografia) throw new ErroAplicacao("Pedido legado exige reconciliação; seus dados originais foram preservados.", 409);
      const resultado = await this.mutar(repository, acao, pedido, corpo, usuario);
      const resposta = this.apresentar(resultado);
      await repository.registrarOperacao(chave, assinatura, resposta);
      return resposta;
    });
  }
  async mutar(repository, acao, pedido, corpo, usuario) {
    if (["criar", "editar", "pagamento", "estorno"].includes(acao)) exigirModuloPedido(usuario);
    let atual = pedido;
    let evento = {};
    if (["criar", "editar"].includes(acao)) {
      if (pedido && fechado(pedido)) throw new ErroAplicacao("Reabra o pedido antes de editar.", 409);
      const proposta = await this.preparar(repository, corpo.dados, usuario, pedido?.fotografia);
      let aprovacao;
      if (acao === "criar" && corpo.autorizacao) {
        aprovacao = this.autorizacoes.validar(corpo.autorizacao, usuario.idUsuario, assinaturaPedido({ proposta: proposta.assinatura, chaveOperacao: corpo.chaveOperacao }));
        const gerente = await this.usuarios.buscarAcessoAtualPorId(aprovacao.idGerente);
        if (gerente?.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Gerente autorizador não possui mais acesso.", 403);
        proposta.impedimentos = proposta.impedimentos.filter((i) => i.codigo !== "AUTORIZACAO");
      }
      if (proposta.impedimentos.length) {
        if (!pedido) throw new ErroAplicacao(proposta.impedimentos[0].mensagem, 422, proposta.impedimentos);
        atual = await repository.atualizar(pedido.id_pedido, { pendencia: proposta, revisao: { increment: 1 } });
        evento = { impedimentos: proposta.impedimentos, proposta: proposta.dados };
      } else {
        const campos = { ...this.camposFotografia(proposta.fotografia), assinatura_catalogo: proposta.assinaturaCatalogo, pendencia: {}, versao_vigente: (pedido?.versao_vigente || 0) + 1, revisao: (pedido?.revisao || 0) + 1 };
        atual = pedido ? await repository.atualizar(pedido.id_pedido, campos) : await repository.criar({ ...campos, id_usuario_atendente: usuario.idUsuario });
        await repository.versao(atual.id_pedido, atual.versao_vigente, atual.fotografia);
        if (aprovacao) await repository.evento(atual.id_pedido, atual.versao_vigente, "AUTORIZACAO_DESCONTO", { idUsuario: aprovacao.idGerente, nome: aprovacao.nomeGerente }, { limiteOriginal: usuario.limiteDesconto, descontoCentavos: atual.fotografia.descontoCentavos, assinatura: proposta.assinatura });
        evento = { anterior: pedido?.fotografia ?? null, novo: atual.fotografia };
      }
    } else if (acao === "autorizar") {
      if (usuario.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Somente gerente autoriza desconto.", 403);
      if (fechado(pedido)) throw new ErroAplicacao("Reabra antes de autorizar a edição.", 409);
      const pendencia = pedido.pendencia;
      if (!pendencia?.assinatura || pendencia.assinatura !== corpo.assinatura) throw new ErroAplicacao("Proposta de desconto desatualizada.", 409);
      const proposta = await this.preparar(repository, pendencia.dados, { ...usuario, idUsuario: pendencia.idSolicitante, perfilAcesso: "ATENDENTE", limiteDesconto: pendencia.fotografia.limiteDescontoOriginal }, pedido.fotografia);
      if (proposta.assinatura !== pendencia.assinatura) throw new ErroAplicacao("Catálogo alterado. Refaça a proposta antes de autorizar.", 409);
      if (proposta.impedimentos.some((i) => i.codigo !== "AUTORIZACAO")) throw new ErroAplicacao("Corrija os demais impedimentos antes de autorizar.", 422);
      atual = await repository.atualizar(pedido.id_pedido, { ...this.camposFotografia(proposta.fotografia), pendencia: {}, assinatura_catalogo: proposta.assinaturaCatalogo, revisao: { increment: 1 }, versao_vigente: { increment: 1 } });
      await repository.versao(atual.id_pedido, atual.versao_vigente, atual.fotografia);
      evento = { anterior: pedido.fotografia, novo: atual.fotografia, limiteOriginal: proposta.fotografia.limiteDescontoOriginal, descontoCentavos: proposta.fotografia.descontoCentavos, assinatura: proposta.assinatura };
    } else if (["status", "cancelar", "reabrir"].includes(acao)) {
      const novo = acao === "cancelar" ? "CANCELADO" : acao === "reabrir" ? "EM_PRODUCAO" : corpo.status;
      if (acao === "reabrir") {
        if (usuario.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Somente gerente reabre pedidos.", 403);
        if (!fechado(pedido)) throw new ErroAplicacao("Pedido já está aberto.", 409);
        if (corpo.dados) {
          const proposta = await this.preparar(repository, corpo.dados, usuario, pedido.fotografia);
          if (proposta.impedimentos.length) throw new ErroAplicacao("Corrija os impedimentos antes de reabrir.", 422, proposta.impedimentos);
          atual = await repository.atualizar(pedido.id_pedido, { ...this.camposFotografia(proposta.fotografia), assinatura_catalogo: proposta.assinaturaCatalogo, pendencia: {}, versao_vigente: { increment: 1 } });
          await repository.versao(atual.id_pedido, atual.versao_vigente, atual.fotografia);
          await repository.evento(atual.id_pedido, atual.versao_vigente, "REVISAO_REABERTURA", usuario, { anterior: pedido.fotografia, novo: atual.fotografia });
        } else atual = await this.sincronizar(repository, pedido, usuario, true);
        if (atual.pendencia?.impedimentos?.length) throw new ErroAplicacao("Reabertura exige corrigir as pendências do catálogo.", 409, atual.pendencia.impedimentos);
      } else {
        autorizarStatus(usuario, pedido.status_pedido, novo);
        if (novo === "ENTREGUE") atual = await this.sincronizar(repository, pedido, usuario);
      }
      atual = await repository.atualizar(pedido.id_pedido, { status_pedido: novo, revisao: { increment: 1 }, ...(acao === "cancelar" && { motivo_cancelamento: corpo.motivo || null, cancelado_em: new Date() }) });
      evento = { anterior: pedido.status_pedido, novo, motivo: corpo.motivo || null };
    } else if (acao === "pagamento") {
      const centavos = paraCentavos(corpo.valor);
      if (centavos <= 0n) throw new ErroAplicacao("Pagamento deve ser positivo.", 422);
      const pagamento = await repository.pagamento(pedido.id_pedido, { valorCentavos: centavos, forma: corpo.forma, situacao: corpo.situacao, realizadoEm: new Date(corpo.realizadoEm), idAutor: usuario.idUsuario, nomeAutor: usuario.nome });
      atual = await repository.atualizar(pedido.id_pedido, { revisao: { increment: 1 } });
      evento = { pagamento };
    } else if (acao === "estorno") {
      const pagamento = pedido.pagamentosVenda.find((p) => p.idPagamento === corpo.idPagamento);
      if (!pagamento) throw new ErroAplicacao("Pagamento não encontrado neste pedido.", 404);
      const centavos = validarEstorno(pagamento, corpo.valor, usuario);
      const estorno = await repository.estorno({ idPagamento: pagamento.idPagamento, valorCentavos: BigInt(centavos), idAutor: usuario.idUsuario, nomeAutor: usuario.nome, motivo: corpo.motivo });
      atual = await repository.atualizar(pedido.id_pedido, { revisao: { increment: 1 } });
      evento = { estorno };
    } else throw new ErroAplicacao("Operação desconhecida.", 422);
    if (evento.anterior && evento.novo && typeof evento.anterior === "object") {
      evento.camposAlterados = Object.keys(evento.novo).filter((campo) => assinaturaPedido(evento.anterior[campo] ?? null) !== assinaturaPedido(evento.novo[campo] ?? null));
    }
    await repository.evento(atual.id_pedido, atual.versao_vigente, acao.toUpperCase(), usuario, evento);
    return atual;
  }
  dadosDaFotografia(fotografia) {
    const { cliente, subtotalCentavos, descontoCentavos, totalCentavos, componentePercentualCentavos, avisos, limiteDescontoOriginal, ...dados } = fotografia;
    return { ...dados, itens: dados.itens.map(({ chaveItem, tipo, idCadastro, quantidade, observacoes, foto }) => ({ chaveItem, tipo, idCadastro, quantidade, observacoes, foto })) };
  }
  async sincronizar(repository, pedido, usuario = {}, reabertura = false) {
    if (!pedido.fotografia || (fechado(pedido) && !reabertura)) return pedido;
    const dados = pedido.pendencia?.dados || this.dadosDaFotografia(pedido.fotografia);
    const proposta = await this.preparar(repository, dados, { ...usuario, idUsuario: pedido.pendencia?.idSolicitante || pedido.id_usuario_atendente, perfilAcesso: reabertura ? usuario.perfilAcesso : "ATENDENTE", limiteDesconto: pedido.fotografia.limiteDescontoOriginal }, pedido.fotografia, true);
    if (proposta.assinaturaCatalogo === pedido.assinatura_catalogo && !pedido.pendencia?.assinatura) return pedido;
    if (proposta.impedimentos.length) {
      if (pedido.pendencia?.assinatura === proposta.assinatura) return pedido;
      const atual = await repository.atualizar(pedido.id_pedido, { pendencia: proposta, revisao: { increment: 1 } });
      await repository.evento(pedido.id_pedido, pedido.versao_vigente, "PENDENCIA_CATALOGO", usuario, proposta.impedimentos);
      return atual;
    }
    const atual = await repository.atualizar(pedido.id_pedido, { ...this.camposFotografia(proposta.fotografia), assinatura_catalogo: proposta.assinaturaCatalogo, pendencia: {}, revisao: { increment: 1 }, versao_vigente: { increment: 1 } });
    await repository.versao(atual.id_pedido, atual.versao_vigente, atual.fotografia);
    await repository.evento(atual.id_pedido, atual.versao_vigente, "ATUALIZACAO_CATALOGO", usuario, { anterior: pedido.fotografia, novo: atual.fotografia });
    return atual;
  }
  async indicadores(consulta) {
    const pedidos = await this.repository.todos(consulta);
    const totais = { faturamentoCentavos: 0n, recebidoCentavos: 0n, estornadoCentavos: 0n, excedenteCentavos: 0n, quantidade: pedidos.length, legados: 0 };
    for (const pedido of pedidos) {
      if (!pedido.fotografia) { totais.legados++; continue; }
      const financeiro = calcularFinanceiro(pedido.fotografia.totalCentavos, pedido.pagamentosVenda);
      if (pedido.status_pedido !== "CANCELADO") totais.faturamentoCentavos += BigInt(pedido.fotografia.totalCentavos);
      for (const campo of ["recebidoCentavos", "estornadoCentavos", "excedenteCentavos"]) totais[campo] += BigInt(financeiro[campo]);
    }
    return totais;
  }
  async capacidade() {
    const pedidos = await this.repository.todos();
    return { totais: calcularCapacidade(pedidos.filter((p) => p.fotografia).map((p) => ({ status: p.status_pedido, fotografia: p.fotografia }))), limites: await this.repository.capacidade(), expediente: await this.repository.expediente() };
  }
}
