import { prisma } from "../database/prisma.js";

function serializar(categoria) {
  if (!categoria) return null;
  return {
    idCategoria: categoria.id_categoria.toString(),
    nome: categoria.nome_categoria,
    unidadesPorPacotePadrao: categoria.unidades_por_pacote_padrao,
    permiteImagem: categoria.permite_imagem,
  };
}

export class CategoriaRepository {
  async listarAtivas() {
    const categorias = await prisma.categorias.findMany({
      where: { ativo: true, item_ativo: true, deletado_em: null },
      orderBy: [{ nome_categoria: "asc" }, { id_categoria: "asc" }],
    });
    return categorias.map(serializar);
  }

  async buscarAtivaPorId(idCategoria) {
    return serializar(await prisma.categorias.findFirst({
      where: {
        id_categoria: Number(idCategoria),
        ativo: true,
        item_ativo: true,
        deletado_em: null,
      },
    }));
  }
}
