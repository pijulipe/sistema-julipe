export class ProdutoController {
  constructor(produtoService) {
    this.produtoService = produtoService;
  }

  criar = async (requisicao, resposta) => resposta.status(201).json({
    mensagem: "Produto cadastrado com sucesso.",
    dados: await this.produtoService.criar(requisicao.dadosValidados.corpo),
  });

  listar = async (requisicao, resposta) =>
    resposta.status(200).json(await this.produtoService.listar(requisicao.dadosValidados.consulta));

  buscarPorId = async (requisicao, resposta) => resposta.status(200).json({
    dados: await this.produtoService.buscarPorId(requisicao.dadosValidados.parametros.id),
  });

  atualizar = async (requisicao, resposta) => resposta.status(200).json({
    mensagem: "Produto atualizado com sucesso.",
    dados: await this.produtoService.atualizar(
      requisicao.dadosValidados.parametros.id,
      requisicao.dadosValidados.corpo,
    ),
  });

  excluir = async (requisicao, resposta) => {
    await this.produtoService.excluir(requisicao.dadosValidados.parametros.id);
    return resposta.status(204).send();
  };

  autorizarUpload = async (requisicao, resposta) => resposta.status(201).json({
    dados: await this.produtoService.autorizarUpload(requisicao.dadosValidados.corpo),
  });
}
