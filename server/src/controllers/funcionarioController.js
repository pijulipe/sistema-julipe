export class FuncionarioController {
  constructor(funcionarioService) {
    this.funcionarioService = funcionarioService;
  }

  substituirExcecoes = async (req, res) => res.json({ dados: await this.funcionarioService.substituirExcecoes(req.usuario, req.dadosValidados.parametros.id, req.dadosValidados.corpo.excecoesModulos) });

  criar = async (requisicao, resposta) => {
    const funcionario = await this.funcionarioService.criar(
      requisicao.usuario,
      requisicao.dadosValidados.corpo,
    );

    return resposta.status(201).json({
      mensagem: "Funcionário cadastrado com sucesso.",
      dados: funcionario,
    });
  };

  listar = async (requisicao, resposta) => {
    const resultado = await this.funcionarioService.listar(
      requisicao.dadosValidados.consulta,
    );

    return resposta.status(200).json(resultado);
  };

  buscarPorId = async (requisicao, resposta) => {
    const funcionario = await this.funcionarioService.buscarPorId(
      requisicao.dadosValidados.parametros.id,
      requisicao.usuario,
    );

    return resposta.status(200).json({ dados: funcionario });
  };

  substituirPermissoes = async (requisicao, resposta) => {
    const resultado = await this.funcionarioService.substituirPermissoes(
      requisicao.usuario,
      requisicao.dadosValidados.parametros.id,
      requisicao.dadosValidados.corpo.modulos,
    );

    return resposta.status(200).json({
      mensagem: "Permissões atualizadas com sucesso.",
      dados: resultado,
    });
  };

  alterarPerfil = async (requisicao, resposta) => {
    const resultado = await this.funcionarioService.alterarPerfil(
      requisicao.usuario,
      requisicao.dadosValidados.parametros.id,
      requisicao.dadosValidados.corpo.perfilAcesso,
    );

    return resposta.status(200).json({
      mensagem: "Perfil de acesso atualizado com sucesso.",
      dados: resultado,
    });
  };

  atualizarDadosCadastrais = async (requisicao, resposta) => {
    const resultado = await this.funcionarioService.atualizarDadosCadastrais(
      requisicao.usuario,
      requisicao.dadosValidados.parametros.id,
      requisicao.dadosValidados.corpo,
    );

    return resposta.status(200).json({
      mensagem: "Dados atualizados com sucesso.",
      dados: resultado,
    });
  };
}
