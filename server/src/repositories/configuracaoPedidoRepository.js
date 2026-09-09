import { prisma } from "../database/prisma.js";
import { ErroAplicacao } from "../utils/erroAplicacao.js";
export class ConfiguracaoPedidoRepository {
  async consultarConfiguracao() {
    const [expediente, limites, cargos] = await Promise.all([prisma.expedientePedido.findMany(), prisma.capacidadeCategoria.findMany(), prisma.cargo.findMany({ orderBy: { nome: "asc" } })]);
    return { expediente, limites, cargos };
  }
  async salvarConfiguracao({ expediente, limites }) {
    return prisma.$transaction(async (conexao) => {
      await conexao.expedientePedido.deleteMany();
      await conexao.expedientePedido.createMany({ data: expediente });
      await conexao.capacidadeCategoria.deleteMany();
      await conexao.capacidadeCategoria.createMany({ data: limites });
      return { expediente, limites };
    });
  }
  async salvarCargo({ idCargo, ...dados }) {
    return idCargo ? prisma.cargo.update({ where: { idCargo }, data: dados }) : prisma.cargo.create({ data: dados });
  }
  async usuarioConfiguracao(idUsuario) { return prisma.usuario.findUnique({ where: { idUsuario } }); }
  async configurarFuncionario(idUsuario, dados) {
    return prisma.$transaction(async (conexao) => {
      if (dados.idCargo && !await conexao.cargo.findUnique({ where: { idCargo: dados.idCargo } })) throw new ErroAplicacao("Cargo não encontrado.", 422);
      const resultado = await conexao.usuario.updateMany({ where: { idUsuario, perfilAcesso: { not: "GERENTE" }, itemAtivo: true, deletadoEm: null }, data: dados });
      if (!resultado.count) throw new ErroAplicacao("Funcionário alterado ou não permite edição. Recarregue.", 409);
      return conexao.usuario.findUnique({ where: { idUsuario }, select: { idUsuario: true, idCargo: true, excecoesModulos: true, cancelamentoIndividual: true, descontoIndividual: true, estornoIndividual: true } });
    });
  }
}
