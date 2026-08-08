export class ClienteController {
  constructor(clienteService) {
    this.clienteService = clienteService;
  }

  criar = async (requisicao, resposta) => {
    const cliente = await this.clienteService.criar(requisicao.dadosValidados.corpo);
    return resposta.status(201).json({ mensagem: "Cliente cadastrado com sucesso.", dados: cliente });
  };

  listar = async (requisicao, resposta) => {
    const resultado = await this.clienteService.listar(requisicao.dadosValidados.consulta);
    return resposta.status(200).json(resultado);
  };

  buscarPorId = async (requisicao, resposta) => {
    const cliente = await this.clienteService.buscarPorId(requisicao.dadosValidados.parametros.id);
    return resposta.status(200).json({ dados: cliente });
  };

  atualizar = async (requisicao, resposta) => {
    const cliente = await this.clienteService.atualizar(
      requisicao.dadosValidados.parametros.id,
      requisicao.dadosValidados.corpo
    );
    return resposta.status(200).json({ mensagem: "Cliente atualizado com sucesso.", dados: cliente });
  };

  excluir = async (requisicao, resposta) => {
    await this.clienteService.excluir(requisicao.dadosValidados.parametros.id);
    return resposta.status(204).send();
  };
}
