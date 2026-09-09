import { perfilAcessoValido } from "../utils/perfisAcesso.js";
import { ErroAplicacao } from "../utils/erroAplicacao.js";

const PERMISSOES_INICIAIS_CADASTRO = ["CLIENTES", "PEDIDOS"];

export class FuncionarioService {
  constructor(funcionarioRepository) {
    this.funcionarioRepository = funcionarioRepository;
  }

  async criar(autor, dados) {
    if (!this.podeCadastrarPerfil(autor, dados.perfilAcesso)) {
      throw new ErroAplicacao("Cadastro desse perfil não autorizado.", 403);
    }

    let idAutenticacaoSupabase;
    try {
      idAutenticacaoSupabase = await this.funcionarioRepository.criarContaAutenticacao(
        dados.email,
        dados.senha,
      );
    } catch (erro) {
      throw new ErroAplicacao(
        `Não foi possível criar a conta de acesso: ${erro.message}`,
        400,
      );
    }

    let funcionario;
    try {
      funcionario = await this.funcionarioRepository.criar({
        idAutenticacaoSupabase,
        nome: dados.nome,
        email: dados.email,
        perfilAcesso: dados.perfilAcesso,
      });
    } catch (erro) {
      await this.funcionarioRepository.excluirContaAutenticacao(idAutenticacaoSupabase);
      throw erro;
    }

    await this.funcionarioRepository.substituirPermissoes(
      funcionario.idUsuario,
      PERMISSOES_INICIAIS_CADASTRO,
    );

    return { ...funcionario, permissoes: PERMISSOES_INICIAIS_CADASTRO };
  }

  podeCadastrarPerfil(autor, perfilDesejado) {
    if (!autor?.perfilAcesso) {
      return false;
    }
    if (!perfilAcessoValido(perfilDesejado)) {
      return false;
    }
    if (autor.perfilAcesso === "GERENTE") {
      return true;
    }
    if (
      autor.perfilAcesso === "ADMINISTRADOR" &&
      perfilDesejado === "ATENDENTE"
    ) {
      return true;
    }
    return false;
  }

  podeEditarPermissoes(autor, funcionarioAlvo) {
    if (
      !autor?.idUsuario ||
      !autor?.perfilAcesso ||
      !funcionarioAlvo?.idUsuario ||
      !funcionarioAlvo?.perfilAcesso ||
      !perfilAcessoValido(autor.perfilAcesso) ||
      !perfilAcessoValido(funcionarioAlvo.perfilAcesso)
    ) {
      return false;
    }
    if (funcionarioAlvo.perfilAcesso === "GERENTE") {
      return false;
    }
    if (autor.perfilAcesso === "GERENTE") {
      return true;
    }
    if (
      autor.perfilAcesso === "ADMINISTRADOR" &&
      autor.idUsuario === funcionarioAlvo.idUsuario
    ) {
      return false;
    }
    if (autor.perfilAcesso === "ADMINISTRADOR") {
      return true;
    }
    return false;
  }

  podeAlterarPerfil(autor, funcionarioAlvo, perfilDesejado) {
    if (
      !autor?.idUsuario ||
      !autor?.perfilAcesso ||
      !funcionarioAlvo?.idUsuario ||
      !funcionarioAlvo?.perfilAcesso ||
      !perfilDesejado ||
      !perfilAcessoValido(autor.perfilAcesso) ||
      !perfilAcessoValido(funcionarioAlvo.perfilAcesso) ||
      !perfilAcessoValido(perfilDesejado)
    ) {
      return false;
    }
    if (funcionarioAlvo.perfilAcesso === "GERENTE") {
      return false;
    }
    if (autor.perfilAcesso === "GERENTE") {
      return true;
    }
    return false;
  }

  async listar(filtros) {
    const resultado = await this.funcionarioRepository.listar(filtros);

    return {
      dados: resultado.funcionarios,
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total: resultado.total,
        totalPaginas: Math.ceil(resultado.total / filtros.limite),
      },
    };
  }

  async buscarPorId(idUsuario, autor) {
    const funcionario = await this.funcionarioRepository.buscarPorId(idUsuario);

    if (!funcionario) {
      throw new ErroAplicacao("Funcionário não encontrado.", 404);
    }

    return {
      ...funcionario,
      acessoTotal: funcionario.perfilAcesso === "GERENTE",
      acoesPermitidas: {
        editarPermissoes: this.podeEditarPermissoes(autor, funcionario),
        alterarPerfil: this.podeAlterarPerfil(
          autor,
          funcionario,
          funcionario.perfilAcesso,
        ),
      },
    };
  }

  async substituirPermissoes(autor, idUsuario, modulos) {
    const funcionario = await this.buscarPorId(idUsuario, autor);

    if (!this.podeEditarPermissoes(autor, funcionario)) {
      throw new ErroAplicacao(
        "Alteração de permissões não autorizada.",
        403,
      );
    }

    const permissoes = await this.funcionarioRepository.substituirPermissoes(
      idUsuario,
      modulos,
    );

    return { idUsuario, permissoes };
  }

  async substituirExcecoes(autor, idUsuario, excecoes) {
    const funcionario = await this.buscarPorId(idUsuario, autor);
    if (!this.podeEditarPermissoes(autor, funcionario)) throw new ErroAplicacao("Alteração de exceções não autorizada.", 403);
    return this.funcionarioRepository.substituirExcecoes(idUsuario, excecoes);
  }

  async alterarPerfil(autor, idUsuario, perfilAcesso) {
    const funcionario = await this.buscarPorId(idUsuario, autor);

    if (!this.podeAlterarPerfil(autor, funcionario, perfilAcesso)) {
      throw new ErroAplicacao("Alteração de perfil não autorizada.", 403);
    }

    const alterado = await this.funcionarioRepository.alterarPerfil(
      idUsuario,
      perfilAcesso,
    );

    if (!alterado) {
      throw new ErroAplicacao("Funcionário não encontrado.", 404);
    }

    return { idUsuario, perfilAcesso };
  }

  async atualizarDadosCadastrais(autor, idUsuario, dados) {
    const funcionario = await this.buscarPorId(idUsuario, autor);

    if (!this.podeEditarPermissoes(autor, funcionario)) {
      throw new ErroAplicacao(
        "Alteração de dados cadastrais não autorizada.",
        403,
      );
    }

    const atualizado = await this.funcionarioRepository.atualizarDadosCadastrais(
      idUsuario,
      dados,
    );

    if (!atualizado) {
      throw new ErroAplicacao("Funcionário não encontrado.", 404);
    }

    return { idUsuario, ...dados };
  }
}
