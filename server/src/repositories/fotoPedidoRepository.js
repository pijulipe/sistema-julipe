import { prisma } from "../database/prisma.js";
export class FotoPedidoRepository {
  criar(caminho, idAutor) { return prisma.fotoPedido.create({ data: { caminho, idAutor } }); }
  buscar(caminho) { return prisma.fotoPedido.findUnique({ where: { caminho } }); }
  confirmar(caminho) { return prisma.fotoPedido.update({ where: { caminho }, data: { confirmada: true } }); }
  async orfaos() {
    // Fotografias de todas as versões conservam o objeto, mesmo removido da versão vigente.
    return prisma.$queryRaw`SELECT f.caminho FROM fotos_pedido f WHERE f.criado_em < now() - interval '1 day'
      AND NOT EXISTS (SELECT 1 FROM versoes_pedido v WHERE v.fotografia::text LIKE '%' || f.caminho || '%')
      AND NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.pendencia::text LIKE '%' || f.caminho || '%') LIMIT 100`;
  }
  remover(caminho) { return prisma.fotoPedido.delete({ where: { caminho } }); }
  async limparOrfao(caminho, removerObjeto) {
    return prisma.$transaction(async (conexao) => {
      const registro = await conexao.$queryRaw`SELECT caminho FROM fotos_pedido WHERE caminho = ${caminho} AND criado_em < now() - interval '1 day' FOR UPDATE SKIP LOCKED`;
      if (!registro.length) return;
      const referencias = await conexao.$queryRaw`SELECT 1 FROM versoes_pedido WHERE fotografia::text LIKE '%' || ${caminho} || '%'
        UNION ALL SELECT 1 FROM pedidos WHERE pendencia::text LIKE '%' || ${caminho} || '%' LIMIT 1`;
      if (referencias.length) return;
      if (await removerObjeto()) await conexao.fotoPedido.delete({ where: { caminho } });
    }, { timeout: 15000 });
  }
}
