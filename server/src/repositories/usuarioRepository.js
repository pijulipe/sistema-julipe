import { prisma } from "../database/prisma.js";

function serializar(usuario) {
  return usuario
    ? {
        ...usuario,
        permissoes: usuario.permissoesFuncionario.map(
          (permissao) => permissao.modulo,
        ),
      }
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
    return {
      idUsuario: usuario.idUsuario,
      perfilAcesso: usuario.perfilAcesso,
      permissoes: permissoesModulo,
    };
  }
}
