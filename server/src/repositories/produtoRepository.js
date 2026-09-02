import { prisma } from "../database/prisma.js";

const incluirCategoria = {
  categorias: {
    select: {
      id_categoria: true,
      nome_categoria: true,
      unidades_por_pacote_padrao: true,
      permite_imagem: true,
    },
  },
};

function serializar(produto) {
  if (!produto) return null;
  return {
    idProduto: produto.id_produto.toString(),
    nome: produto.nome,
    descricao: produto.descricao,
    precoUnitario: Number(produto.preco_unitario),
    unidadeMedida: produto.unidade_medida,
    multiploMinimo: produto.multiplo_minimo,
    tempoPreparoMinutos: produto.tempo_preparo_minutos,
    caminhoImagem: produto.url_imagem,
    ativo: produto.ativo,
    categoria: {
      idCategoria: produto.categorias.id_categoria.toString(),
      nome: produto.categorias.nome_categoria,
      unidadesPorPacotePadrao: produto.categorias.unidades_por_pacote_padrao,
      permiteImagem: produto.categorias.permite_imagem,
    },
  };
}

function preparar(dados) {
  const mapeamento = {
    nome: "nome",
    descricao: "descricao",
    idCategoria: "id_categoria",
    precoUnitario: "preco_unitario",
    unidadeMedida: "unidade_medida",
    multiploMinimo: "multiplo_minimo",
    tempoPreparoMinutos: "tempo_preparo_minutos",
    caminhoImagem: "url_imagem",
    ativo: "ativo",
  };
  return Object.fromEntries(Object.entries(dados).map(([chave, valor]) => [
    mapeamento[chave], chave === "descricao" && valor === "" ? null : valor,
  ]));
}

export class ProdutoRepository {
  constructor(clientePrisma = prisma) {
    this.prisma = clientePrisma;
  }

  async criar(dados) {
    return serializar(await this.prisma.produtos.create({
      data: { ...preparar(dados), permite_imagem: false },
      include: incluirCategoria,
    }));
  }

  async buscarPorId(idProduto) {
    return serializar(await this.prisma.produtos.findFirst({
      where: { id_produto: Number(idProduto), item_ativo: true, deletado_em: null },
      include: incluirCategoria,
    }));
  }

  async buscarPorCaminhoImagem(caminhoImagem, ignorarIdProduto) {
    const produto = await this.prisma.produtos.findFirst({
      where: {
        url_imagem: caminhoImagem,
        item_ativo: true,
        deletado_em: null,
        ...(ignorarIdProduto && { id_produto: { not: Number(ignorarIdProduto) } }),
      },
      select: { id_produto: true },
    });
    return produto?.id_produto.toString() || null;
  }

  async listar({ busca, idCategoria, ativo, pagina, limite }) {
    const where = {
      item_ativo: true,
      deletado_em: null,
      ...(busca && { nome: { contains: busca, mode: "insensitive" } }),
      ...(idCategoria && { id_categoria: idCategoria }),
      ...(ativo !== undefined && { ativo }),
    };
    const [produtos, total] = await this.prisma.$transaction([
      this.prisma.produtos.findMany({
        where,
        include: incluirCategoria,
        orderBy: [{ nome: "asc" }, { id_produto: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.produtos.count({ where }),
    ]);
    return { produtos: produtos.map(serializar), total };
  }

  async atualizar(idProduto, dados) {
    return this.prisma.$transaction(async (transacao) => {
      const produto = await transacao.produtos.update({
        where: { id_produto: Number(idProduto) },
        data: preparar(dados),
        include: incluirCategoria,
      });
      if (dados.ativo === false) {
        await transacao.combos.updateMany({
          where: {
            item_ativo: true,
            deletado_em: null,
            itens_combo: { some: { id_produto: Number(idProduto) } },
          },
          data: { ativo: false },
        });
      }
      return serializar(produto);
    });
  }

  async excluir(idProduto) {
    return this.prisma.$transaction(async (transacao) => {
      const resultado = await transacao.produtos.updateMany({
        where: { id_produto: Number(idProduto), item_ativo: true, deletado_em: null },
        data: { item_ativo: false, ativo: false, deletado_em: new Date(), url_imagem: null },
      });
      if (resultado.count > 0) {
        await transacao.combos.updateMany({
          where: {
            item_ativo: true,
            deletado_em: null,
            itens_combo: { some: { id_produto: Number(idProduto) } },
          },
          data: { ativo: false },
        });
      }
      return resultado.count > 0;
    });
  }
}
