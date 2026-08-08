export function validar(esquema) {
  return (requisicao, resposta, proximo) => {
    const resultado = esquema.safeParse({
      corpo: requisicao.body,
      parametros: requisicao.params,
      consulta: requisicao.query,
    });

    if (!resultado.success) {
      return resposta.status(422).json({
        mensagem: "Dados inválidos.",
        erros: resultado.error.issues.map((erro) => ({
          campo: erro.path.join("."),
          mensagem: erro.message,
        })),
      });
    }

    requisicao.dadosValidados = resultado.data;
    return proximo();
  };
}
