import { ErroAplicacao } from "../utils/erroAplicacao.js";

export class ConfiguracaoPedidoService {
  constructor(repository) { this.repository = repository; }
  gerente(usuario) { if (usuario.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Somente gerente configura cargos e limites.", 403); }
  async consultar(usuario) { this.gerente(usuario); return this.repository.consultarConfiguracao(); }
  async salvar(dados, usuario) { this.gerente(usuario); return this.repository.salvarConfiguracao(dados); }
  async cargo(dados, usuario) { this.gerente(usuario); return this.repository.salvarCargo(dados); }
  async consultarFuncionario(id, usuario) {
    this.gerente(usuario);
    const alvo = await this.repository.usuarioConfiguracao(id);
    if (!alvo || !alvo.itemAtivo || alvo.deletadoEm) throw new ErroAplicacao("Funcionário não encontrado.", 404);
    const { idCargo, excecoesModulos, cancelamentoIndividual, descontoIndividual, estornoIndividual } = alvo;
    return { idCargo, excecoesModulos, cancelamentoIndividual, descontoIndividual, estornoIndividual };
  }
  async funcionario(id, dados, usuario) {
    this.gerente(usuario);
    const alvo = await this.repository.usuarioConfiguracao(id);
    if (!alvo || !alvo.itemAtivo || alvo.deletadoEm) throw new ErroAplicacao("Funcionário não encontrado.", 404);
    if (alvo.perfilAcesso === "GERENTE") throw new ErroAplicacao("Não é permitido alterar este funcionário.", 403);
    return this.repository.configurarFuncionario(id, dados);
  }
}
