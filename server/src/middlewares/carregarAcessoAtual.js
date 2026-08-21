export function carregarAcessoAtual(usuarioRepository) {
  return async (requisicao, resposta, proximo) => {
    const acessoAtual = await usuarioRepository.buscarAcessoAtualPorId(
      requisicao.usuario.idUsuario,
    );

    if (acessoAtual === null) {
      return resposta.status(401).json({
        mensagem: "Funcionário inativo ou não encontrado.",
      });
    }

    requisicao.usuario = acessoAtual;
    return proximo();
  };
}
