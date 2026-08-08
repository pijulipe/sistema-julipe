export function autorizarModulo(modulo) {
  return (requisicao, resposta, proximo) => {
    const usuario = requisicao.usuario;
    const gerente = usuario?.perfilAcesso === "GERENTE";
    const possuiPermissao = usuario?.permissoes.includes(modulo);

    if (!gerente && !possuiPermissao) {
      return resposta.status(403).json({
        mensagem: `Acesso ao módulo ${modulo.toLowerCase()} não autorizado.`,
      });
    }

    return proximo();
  };
}
