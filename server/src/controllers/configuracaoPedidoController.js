export class ConfiguracaoPedidoController {
  constructor(servico) { this.servico = servico; }
  consultar = async (req, res) => res.json({ dados: await this.servico.consultar(req.usuario) });
  salvar = async (req, res) => res.json({ dados: await this.servico.salvar(req.dadosValidados.corpo, req.usuario) });
  cargo = async (req, res) => res.json({ dados: await this.servico.cargo(req.dadosValidados.corpo, req.usuario) });
  consultarFuncionario = async (req, res) => res.json({ dados: await this.servico.consultarFuncionario(req.dadosValidados.parametros.id, req.usuario) });
  funcionario = async (req, res) => res.json({ dados: await this.servico.funcionario(req.dadosValidados.parametros.id, req.dadosValidados.corpo, req.usuario) });
}
