export class ComboController {
  constructor(comboService) {
    this.comboService = comboService;
  }

  criar = async (requisicao, resposta) => resposta.status(201).json({
    mensagem: "Combo cadastrado com sucesso.",
    dados: await this.comboService.criar(requisicao.dadosValidados.corpo),
  });

  listar = async (requisicao, resposta) =>
    resposta.status(200).json(await this.comboService.listar(requisicao.dadosValidados.consulta));

  buscarPorId = async (requisicao, resposta) => resposta.status(200).json({
    dados: await this.comboService.buscarPorId(requisicao.dadosValidados.parametros.id),
  });

  atualizar = async (requisicao, resposta) => resposta.status(200).json({
    mensagem: "Combo atualizado com sucesso.",
    dados: await this.comboService.atualizar(
      requisicao.dadosValidados.parametros.id,
      requisicao.dadosValidados.corpo,
    ),
  });

  excluir = async (requisicao, resposta) => {
    await this.comboService.excluir(requisicao.dadosValidados.parametros.id);
    return resposta.status(204).send();
  };
}
