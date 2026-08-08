import { ErroAplicacao } from "../utils/erroAplicacao.js";

export function tratarErros(erro, requisicao, resposta, proximo) {
  if (resposta.headersSent) return proximo(erro);

  if (erro instanceof ErroAplicacao) {
    return resposta.status(erro.status).json({
      mensagem: erro.message,
      ...(erro.detalhes && { detalhes: erro.detalhes }),
    });
  }

  console.error("Erro interno não tratado:", erro);
  return resposta.status(500).json({ mensagem: "Erro interno do servidor." });
}

export function tratarRotaNaoEncontrada(requisicao, resposta) {
  return resposta.status(404).json({ mensagem: "Rota não encontrada." });
}
