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
  async criar(dados) {
    return serializar(await prisma.produtos.create({
      data: { ...preparar(dados), permite_imagem: false },
      include: incluirCategoria,
    }));
  }

  async buscarPorId(idProduto) {
    return serializar(await prisma.produtos.findFirst({
      where: { id_produto: Number(idProduto), item_ativo: true, deletado_em: null },
      include: incluirCategoria,
    }));
  }

  async buscarPorCaminhoImagem(caminhoImagem, ignorarIdProduto) {
    const produto = await prisma.produtos.findFirst({
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
    const [produtos, total] = await prisma.$transaction([
      prisma.produtos.findMany({
        where,
        include: incluirCategoria,
        orderBy: [{ nome: "asc" }, { id_produto: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.produtos.count({ where }),
    ]);
    return { produtos: produtos.map(serializar), total };
  }

  async atualizar(idProduto, dados) {
    return serializar(await prisma.produtos.update({
      where: { id_produto: Number(idProduto) },
      data: preparar(dados),
      include: incluirCategoria,
    }));
  }

  async excluir(idProduto) {
    const resultado = await prisma.produtos.updateMany({
      where: { id_produto: Number(idProduto), item_ativo: true, deletado_em: null },
      data: { item_ativo: false, ativo: false, deletado_em: new Date(), url_imagem: null },
    });
    return resultado.count > 0;
  }
}
