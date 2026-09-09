import { prisma } from "../database/prisma.js";
import { acessoEfetivo } from "../utils/acessoPedido.js";

function serializar(usuario) {
  return usuario
    ? acessoEfetivo({
        ...usuario,
        permissoes: usuario.permissoesFuncionario.map(
          (permissao) => permissao.modulo,
        ),
      })
    : null;
}

export class UsuarioRepository {
  async buscarPorAutenticacaoSupabase(idAutenticacaoSupabase) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        idAutenticacaoSupabase: idAutenticacaoSupabase,
        ativo: true,
        itemAtivo: true,
        deletadoEm: null,
      },

      include: {
        cargo: true,
        permissoesFuncionario: { where: { itemAtivo: true, deletadoEm: null } },
      },
    });
    return serializar(usuario);
  }

  async buscarAcessoAtualPorId(idUsuario) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        idUsuario: idUsuario,
        ativo: true,
        itemAtivo: true,
        deletadoEm: null,
      },

      select: {
        nome: true,
        cargo: true,
        excecoesModulos: true,
        cancelamentoIndividual: true,
        descontoIndividual: true,
        estornoIndividual: true,
        idUsuario: true,
        perfilAcesso: true,
        permissoesFuncionario: { where: { itemAtivo: true, deletadoEm: null }, select:{ modulo: true } },
      },
    });
    if (usuario === null) {
      return null;
    }

    const permissoesModulo = usuario.permissoesFuncionario.map((permissao) =>
      permissao.modulo.trim().toUpperCase(),
    );
    return acessoEfetivo({
      ...usuario,
      idUsuario: usuario.idUsuario,
      perfilAcesso: usuario.perfilAcesso,
      permissoes: permissoesModulo,
    });
  }
}
