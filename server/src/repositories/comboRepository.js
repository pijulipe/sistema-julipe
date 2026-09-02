import { prisma } from "../database/prisma.js";

const incluirItens = {
  itens_combo: {
    include: {
      produtos: { select: { id_produto: true, nome: true, multiplo_minimo: true, ativo: true } },
    },
    orderBy: { id_produto: "asc" },
  },
};

function serializar(combo) {
  if (!combo) return null;
  return {
    idCombo: combo.id_combo.toString(),
    nome: combo.nome,
    descricao: combo.descricao,
    preco: Number(combo.preco),
    versao: combo.versao,
    ativo: combo.ativo,
    itens: combo.itens_combo.map((item) => ({
      idProduto: item.id_produto.toString(),
      quantidade: Number(item.quantidade),
      produto: {
        nome: item.produtos.nome,
        multiploMinimo: item.produtos.multiplo_minimo,
        ativo: item.produtos.ativo,
      },
    })),
  };
}

export class ComboRepository {
  async buscarPorNomeNormalizado(nomeNormalizado, ignorarIdCombo) {
    const registros = await prisma.$queryRaw`
      SELECT id_combo FROM public.combos
      WHERE LOWER(TRIM(nome)) = ${nomeNormalizado}
        AND item_ativo = TRUE AND deletado_em IS NULL
        AND (${ignorarIdCombo ? Number(ignorarIdCombo) : null}::integer IS NULL
          OR id_combo <> ${ignorarIdCombo ? Number(ignorarIdCombo) : null}::integer)
      LIMIT 1
    `;
    return registros[0]?.id_combo?.toString() || null;
  }

  async buscarProdutosPorIds(ids) {
    const produtos = await prisma.produtos.findMany({
      where: { id_produto: { in: ids }, ativo: true, item_ativo: true, deletado_em: null },
      select: { id_produto: true, nome: true, multiplo_minimo: true },
    });
    return produtos.map((produto) => ({
      idProduto: produto.id_produto.toString(),
      nome: produto.nome,
      multiploMinimo: produto.multiplo_minimo,
    }));
  }

  async criar(dados) {
    return prisma.$transaction(async (transacao) => serializar(await transacao.combos.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
        preco: dados.preco,
        ativo: dados.ativo,
        itens_combo: {
          create: dados.itens.map((item) => ({
            id_produto: Number(item.idProduto),
            quantidade: item.quantidade,
          })),
        },
      },
      include: incluirItens,
    })));
  }

  async buscarPorId(idCombo) {
    return serializar(await prisma.combos.findFirst({
      where: { id_combo: Number(idCombo), item_ativo: true, deletado_em: null },
      include: incluirItens,
    }));
  }

  async listar({ busca, ativo, pagina, limite }) {
    const where = {
      item_ativo: true,
      deletado_em: null,
      ...(busca && { nome: { contains: busca, mode: "insensitive" } }),
      ...(ativo !== undefined && { ativo }),
    };
    const [combos, total] = await prisma.$transaction([
      prisma.combos.findMany({
        where,
        include: incluirItens,
        orderBy: [{ nome: "asc" }, { id_combo: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.combos.count({ where }),
    ]);
    return { combos: combos.map(serializar), total };
  }

  async atualizar(idCombo, dados) {
    return prisma.$transaction(async (transacao) => {
      const { itens, incrementarVersao, ...campos } = dados;
      if (Object.hasOwn(dados, "itens")) {
        await transacao.itens_combo.deleteMany({ where: { id_combo: Number(idCombo) } });
      }
      return serializar(await transacao.combos.update({
        where: { id_combo: Number(idCombo) },
        data: {
          ...campos,
          ...(incrementarVersao && { versao: { increment: 1 } }),
          ...(Object.hasOwn(dados, "itens") && {
            itens_combo: {
              create: itens.map((item) => ({
                id_produto: Number(item.idProduto),
                quantidade: item.quantidade,
              })),
            },
          }),
        },
        include: incluirItens,
      }));
    });
  }

  async excluir(idCombo) {
    const resultado = await prisma.combos.updateMany({
      where: { id_combo: Number(idCombo), item_ativo: true, deletado_em: null },
      data: { item_ativo: false, ativo: false, deletado_em: new Date() },
    });
    return resultado.count > 0;
  }
}
