import { ErroAplicacao } from "../utils/erroAplicacao.js";

export class ClienteService {
  constructor(clienteRepository) {
    this.clienteRepository = clienteRepository;
  }

  async criar(dados) {
    return this.clienteRepository.criar(dados);
  }

  async buscarPorId(idCliente) {
    const cliente = await this.clienteRepository.buscarPorId(idCliente);
    if (!cliente) throw new ErroAplicacao("Cliente não encontrado.", 404);
    return cliente;
  }

  async listar(filtros) {
    const resultado = await this.clienteRepository.listar(filtros);
    return {
      dados: resultado.clientes,
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total: resultado.total,
        totalPaginas: Math.ceil(resultado.total / filtros.limite),
      },
    };
  }

  async atualizar(idCliente, dados) {
    await this.buscarPorId(idCliente);
    return this.clienteRepository.atualizar(idCliente, dados);
  }

  async excluir(idCliente) {
    const excluido = await this.clienteRepository.excluir(idCliente);
    if (!excluido) throw new ErroAplicacao("Cliente não encontrado.", 404);
  }
}
