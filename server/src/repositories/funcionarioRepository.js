import { prisma } from "../database/prisma.js";
import { supabaseAdmin } from "../database/supabaseAdmin.js";
import { moduloValido, chavesModulos } from "../utils/modulos.js";
import { acessoEfetivo } from "../utils/acessoPedido.js";

export class FuncionarioRepository {
  async criarContaAutenticacao(email, senha) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { criado_por_admin: true },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.user.id;
  }

  async excluirContaAutenticacao(idAutenticacaoSupabase) {
    await supabaseAdmin.auth.admin.deleteUser(idAutenticacaoSupabase);
  }

  async criar(dados) {
    return prisma.usuario.create({
      data: {
        idAutenticacaoSupabase: dados.idAutenticacaoSupabase,
        nome: dados.nome,
        email: dados.email,
        perfilAcesso: dados.perfilAcesso,
      },
      select: {
        idUsuario: true,
        nome: true,
        email: true,
        perfilAcesso: true,
        ativo: true,
      },
    });
  }

  async buscarPorId(idUsuario) {
    const funcionario = await prisma.usuario.findFirst({
      where: {
        idUsuario,
        itemAtivo: true,
        deletadoEm: null,
      },
      select: {
        cargo: true,
        excecoesModulos: true,
        cancelamentoIndividual: true,
        descontoIndividual: true,
        estornoIndividual: true,
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
      cargo: funcionario.cargo,
      excecoesModulos: funcionario.excecoesModulos,
      permissoesEfetivas: acessoEfetivo({ ...funcionario, permissoes }).permissoes,
    };
  }

  async substituirExcecoes(idUsuario, excecoesModulos) {
    const atualizado = await prisma.usuario.update({ where: { idUsuario }, data: { excecoesModulos }, select: { idUsuario: true, excecoesModulos: true } });
    return atualizado;
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

  async atualizarDadosCadastrais(idUsuario, dados) {
    const resultado = await prisma.usuario.updateMany({
      where: {
        idUsuario,
        itemAtivo: true,
        deletadoEm: null,
      },
      data: dados,
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
