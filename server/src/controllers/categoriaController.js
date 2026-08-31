export class CategoriaController {
  constructor(categoriaService) {
    this.categoriaService = categoriaService;
  }

  listar = async (requisicao, resposta) =>
    resposta.status(200).json(await this.categoriaService.listar());
}
