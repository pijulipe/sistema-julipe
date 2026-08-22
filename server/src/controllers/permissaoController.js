export class PermissaoController {
  constructor(permissaoService) {
    this.permissaoService = permissaoService;
  }

  listarModulos = async (requisicao, resposta) => {
    const modulos = this.permissaoService.listarModulos();
    return resposta.status(200).json({ dados: modulos });
  };
}
