import { prisma } from "../database/prisma.js";
import { moduloValido, chavesModulos } from "../utils/modulos.js";

export class FuncionarioRepository {
  async buscarPorId(idUsuario) {
    const funcionario = await prisma.usuario.findFirst({
      where: {
        idUsuario,
        itemAtivo: true,
        deletadoEm: null,
      },
      select: {
        idUsuario: true,
        nome: true,
        email: true,
        perfilAcesso: true,
        ativo: true,
        permissoesFuncionario: {
          where: {
            itemAtivo: true,
            deletadoEm: null,
          },
          select: {
            modulo: true,
          },
        },
      },
    });
    if (!funcionario) {
      return null;
    }
    const permissoes = [
      ...new Set(
        funcionario.permissoesFuncionario
          .map((permissao) => permissao.modulo.trim().toUpperCase())
          .filter(moduloValido),
      ),
    ].sort((a, b) => chavesModulos.indexOf(a) - chavesModulos.indexOf(b));
    return {
      idUsuario: funcionario.idUsuario,
      nome: funcionario.nome,
      email: funcionario.email,
      perfilAcesso: funcionario.perfilAcesso,
      ativo: funcionario.ativo,
      permissoes: funcionario.perfilAcesso === "GERENTE" ? [] : permissoes,
    };
  }

  async listar({ busca, perfilAcesso, ativo, pagina, limite }) {
    const where = {
      itemAtivo: true,
      deletadoEm: null,
      ...(busca && {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { email: { contains: busca, mode: "insensitive" } },
        ],
      }),
      ...(perfilAcesso && {
        perfilAcesso,
      }),
      ...(ativo !== undefined && {
        ativo,
      }),
    };
    const select = {
      idUsuario: true,
      nome: true,
      email: true,
      perfilAcesso: true,
      ativo: true,
    };

    const [funcionarios, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        where,
        select,
        orderBy: [{ nome: "asc" }, { idUsuario: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.usuario.count({ where }),
    ]);

    return { funcionarios, total };
  }

  async alterarPerfil(idUsuario, perfilAcesso) {
    const resultado = await prisma.usuario.updateMany({
      where: {
        idUsuario,
        itemAtivo: true,
        deletadoEm: null,
      },
      data: {
        perfilAcesso,
      },
    });
    return resultado.count > 0;
  }

  async substituirPermissoes(idUsuario, modulos) {
    return prisma.$transaction(async (transacao) => {
      const permissoesExistentes =
        await transacao.permissaoFuncionario.findMany({
          where: {
            idUsuario,
          },
          select: {
            idPermissao: true,
            modulo: true,
            itemAtivo: true,
            deletadoEm: true,
          },
          orderBy: { idPermissao: "asc" },
        });
      const agora = new Date();
      await transacao.permissaoFuncionario.updateMany({
        where: {
          idUsuario,
          itemAtivo: true,
          deletadoEm: null,
        },
        data: {
          itemAtivo: false,
          deletadoEm: agora,
        },
      });
      for (const modulo of modulos) {
        const permissaoExistente = permissoesExistentes.find(
          (permissao) => permissao.modulo.trim().toUpperCase() === modulo,
        );
        if (permissaoExistente) {
          await transacao.permissaoFuncionario.update({
            where: { idPermissao: permissaoExistente.idPermissao },
            data: { modulo, itemAtivo: true, deletadoEm: null },
          });
        } else {
          await transacao.permissaoFuncionario.create({
            data: { idUsuario, modulo, itemAtivo: true, deletadoEm: null },
          });
        }
      }
      return chavesModulos.filter((chaveCatalogo) =>
        modulos.includes(chaveCatalogo),
      );
    });
  }
}
