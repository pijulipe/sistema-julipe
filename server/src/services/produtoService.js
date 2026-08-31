import { ErroAplicacao } from "../utils/erroAplicacao.js";

export class ProdutoService {
  constructor(produtoRepository, categoriaRepository, armazenamentoService) {
    this.produtoRepository = produtoRepository;
    this.categoriaRepository = categoriaRepository;
    this.armazenamentoService = armazenamentoService;
  }

  async adicionarUrlImagem(produto) {
    if (!produto) return null;
    return {
      ...produto,
      imagemUrl: await this.armazenamentoService.criarUrlLeitura(produto.caminhoImagem),
    };
  }

  async validarCategoria(idCategoria) {
    const categoria = await this.categoriaRepository.buscarAtivaPorId(idCategoria);
    if (!categoria) throw new ErroAplicacao("Categoria não encontrada ou indisponível.", 422);
    return categoria;
  }

  async validarNovaImagem(caminhoImagem, categoria, ignorarIdProduto) {
    if (!caminhoImagem) return;
    if (!categoria.permiteImagem) {
      throw new ErroAplicacao("A categoria selecionada não permite imagem.", 422);
    }
    const produtoDono = await this.produtoRepository.buscarPorCaminhoImagem(
      caminhoImagem,
      ignorarIdProduto,
    );
    if (produtoDono) throw new ErroAplicacao("A imagem já pertence a outro produto.", 422);
    if (!(await this.armazenamentoService.existe(caminhoImagem))) {
      throw new ErroAplicacao("Imagem não encontrada no armazenamento.", 422);
    }
  }

  async criar(dados) {
    const categoria = await this.validarCategoria(dados.idCategoria);
    await this.validarNovaImagem(dados.caminhoImagem, categoria);
    return this.adicionarUrlImagem(await this.produtoRepository.criar(dados));
  }

  async buscarPorId(idProduto) {
    const produto = await this.produtoRepository.buscarPorId(idProduto);
    if (!produto) throw new ErroAplicacao("Produto não encontrado.", 404);
    return this.adicionarUrlImagem(produto);
  }

  async listar(filtros) {
    if (filtros.idCategoria) await this.validarCategoria(filtros.idCategoria);
    const resultado = await this.produtoRepository.listar(filtros);
    return {
      dados: await Promise.all(resultado.produtos.map((produto) => this.adicionarUrlImagem(produto))),
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total: resultado.total,
        totalPaginas: Math.ceil(resultado.total / filtros.limite),
      },
    };
  }

  async atualizar(idProduto, dados) {
    const atual = await this.produtoRepository.buscarPorId(idProduto);
    if (!atual) throw new ErroAplicacao("Produto não encontrado.", 404);

    const idCategoria = dados.idCategoria ?? Number(atual.categoria.idCategoria);
    const categoria = await this.validarCategoria(idCategoria);
    const informouImagem = Object.hasOwn(dados, "caminhoImagem");
    if (informouImagem && dados.caminhoImagem && !categoria.permiteImagem) {
      throw new ErroAplicacao("A categoria selecionada não permite imagem.", 422);
    }
    let caminhoImagem = informouImagem ? dados.caminhoImagem : atual.caminhoImagem;
    if (!categoria.permiteImagem) caminhoImagem = null;

    if (caminhoImagem && caminhoImagem !== atual.caminhoImagem) {
      await this.validarNovaImagem(caminhoImagem, categoria, idProduto);
    }
    const produto = await this.produtoRepository.atualizar(idProduto, {
      ...dados,
      ...(caminhoImagem !== atual.caminhoImagem && { caminhoImagem }),
    });
    if (atual.caminhoImagem && atual.caminhoImagem !== caminhoImagem) {
      await this.armazenamentoService.remover(atual.caminhoImagem);
    }
    return this.adicionarUrlImagem(produto);
  }

  async excluir(idProduto) {
    const atual = await this.produtoRepository.buscarPorId(idProduto);
    if (!atual) throw new ErroAplicacao("Produto não encontrado.", 404);
    if (!(await this.produtoRepository.excluir(idProduto))) {
      throw new ErroAplicacao("Produto não encontrado.", 404);
    }
    if (atual.caminhoImagem) await this.armazenamentoService.remover(atual.caminhoImagem);
  }

  autorizarUpload(dados) {
    return this.armazenamentoService.autorizarUpload(dados);
  }
}
