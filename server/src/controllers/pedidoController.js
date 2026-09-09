export class PedidoController {
  constructor(servico, fotos) { this.servico = servico; this.fotos = fotos; }
  acesso = (req, res) => { const { idUsuario, perfilAcesso, permissoes, podeCancelarPedido, limiteDesconto, limiteEstorno } = req.usuario; res.json({ dados: { idUsuario, perfilAcesso, permissoes, podeCancelarPedido, limiteDesconto, limiteEstorno } }); };
  painel = async (req, res) => res.json({ dados: await this.servico.painel(req.usuario) });
  venda = async (req, res) => res.json({ dados: await this.servico.venda(req.dadosValidados.consulta.busca, req.usuario) });
  autorizarNovo = async (req, res) => res.json({ dados: await this.servico.autorizarNovo(req.dadosValidados.corpo, req.usuario) });
  upload = async (req, res) => res.json({ dados: await this.fotos.autorizar(req.dadosValidados.corpo, req.usuario) });
  confirmarFoto = async (req, res) => res.json({ dados: await this.fotos.confirmar(req.dadosValidados.corpo.caminho, req.usuario) });
  consultarFotos = async (req, res) => res.json({ dados: await this.fotos.urls(await this.servico.fotografiaVersao(req.dadosValidados.parametros.id, req.dadosValidados.consulta.versao, req.usuario)) });
  listar = async (req, res) => res.json(await this.servico.listar(req.dadosValidados.consulta, req.usuario));
  buscar = async (req, res) => res.json({ dados: await this.servico.buscar(req.dadosValidados.parametros.id, req.usuario) });
  acao = (acao) => async (req, res) => res.status(acao === "criar" ? 201 : 200).json({ dados: await this.servico.executar(acao, req.dadosValidados.parametros.id, req.dadosValidados.corpo, req.usuario) });
  indicadores = async (req, res) => res.json({ dados: await this.servico.indicadores(req.dadosValidados.consulta) });
  capacidade = async (req, res) => { this.servico.exigirLeitura(req.usuario); res.json({ dados: await this.servico.capacidade() }); };
  previa = async (req, res) => res.json({ dados: await this.servico.previa(req.dadosValidados.corpo, req.usuario) });
  historico = async (req, res) => {
    res.json({ dados: await this.servico.historico(req.dadosValidados.parametros.id, req.dadosValidados.consulta.pagina, req.usuario) });
  };
}
