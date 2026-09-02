import { ErroAplicacao } from "../utils/erroAplicacao.js";

const normalizarNome = (nome) => nome.trim().toLocaleLowerCase("pt-BR");
const normalizarDescricao = (descricao) => descricao === "" ? null : descricao;
const chaveComposicao = (itens) => itens
  .map(({ idProduto, quantidade }) => `${Number(idProduto)}:${Number(quantidade)}`)
  .sort()
  .join("|");

export class ComboService {
  constructor(comboRepository) {
    this.comboRepository = comboRepository;
  }

  async validarNome(nome, ignorarIdCombo) {
    const existente = await this.comboRepository.buscarPorNomeNormalizado(
      normalizarNome(nome),
      ignorarIdCombo,
    );
    if (existente) throw new ErroAplicacao("Já existe um combo com este nome.", 409);
  }

  async validarComposicao(itens) {
    if (!itens?.length) throw new ErroAplicacao("Combo deve possuir ao menos um produto.", 422);
    const ids = itens.map(({ idProduto }) => Number(idProduto));
    if (new Set(ids).size !== ids.length) {
      throw new ErroAplicacao("Um produto não pode aparecer mais de uma vez no combo.", 422);
    }
    const produtos = await this.comboRepository.buscarProdutosPorIds(ids);
    const porId = new Map(produtos.map((produto) => [Number(produto.idProduto), produto]));
    for (const item of itens) {
      const produto = porId.get(Number(item.idProduto));
      if (!produto) throw new ErroAplicacao("Produto não encontrado ou indisponível.", 422);
      const quantidade = Number(item.quantidade);
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw new ErroAplicacao("Quantidade deve ser maior que zero.", 422);
      }
      const quociente = quantidade / produto.multiploMinimo;
      if (Math.abs(quociente - Math.round(quociente)) > 1e-9) {
        throw new ErroAplicacao(
          `Quantidade de ${produto.nome} deve respeitar o múltiplo mínimo ${produto.multiploMinimo}.`,
          422,
        );
      }
    }
  }

  async executarGravacao(acao) {
    try {
      return await acao();
    } catch (erro) {
      if (erro?.code === "P2002" || erro?.code === "23505") {
        throw new ErroAplicacao("Já existe um combo com este nome.", 409);
      }
      throw erro;
    }
  }

  async criar(dados) {
    await this.validarNome(dados.nome);
    await this.validarComposicao(dados.itens);
    return this.executarGravacao(() => this.comboRepository.criar({
      ...dados,
      descricao: normalizarDescricao(dados.descricao),
    }));
  }

  async buscarPorId(idCombo) {
    const combo = await this.comboRepository.buscarPorId(idCombo);
    if (!combo) throw new ErroAplicacao("Combo não encontrado.", 404);
    return combo;
  }

  async listar(filtros) {
    const resultado = await this.comboRepository.listar(filtros);
    return {
      dados: resultado.combos,
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total: resultado.total,
        totalPaginas: Math.ceil(resultado.total / filtros.limite),
      },
    };
  }

  async atualizar(idCombo, dados) {
    const atual = await this.buscarPorId(idCombo);
    if (Object.hasOwn(dados, "nome")) await this.validarNome(dados.nome, idCombo);
    const itens = dados.itens ?? atual.itens;
    if (Object.hasOwn(dados, "itens") || dados.ativo === true) await this.validarComposicao(itens);

    const nome = dados.nome ?? atual.nome;
    const preco = dados.preco ?? atual.preco;
    const mudouVersionado = nome !== atual.nome
      || Number(preco) !== Number(atual.preco)
      || chaveComposicao(itens) !== chaveComposicao(atual.itens);

    return this.executarGravacao(() => this.comboRepository.atualizar(idCombo, {
      ...dados,
      ...(Object.hasOwn(dados, "descricao") && {
        descricao: normalizarDescricao(dados.descricao),
      }),
      incrementarVersao: mudouVersionado,
    }));
  }

  async excluir(idCombo) {
    await this.buscarPorId(idCombo);
    if (!(await this.comboRepository.excluir(idCombo))) {
      throw new ErroAplicacao("Combo não encontrado.", 404);
    }
  }
}
