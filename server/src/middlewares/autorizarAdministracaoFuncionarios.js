export function autorizarAdministracaoFuncionarios(
  requisicao,
  resposta,
  proximo,
) {
  const usuario = requisicao.usuario;
  const usuarioPerfilAcesso = usuario?.perfilAcesso;
  const possuiAcessoAdministrativo =
    usuarioPerfilAcesso === "GERENTE" ||
    usuarioPerfilAcesso === "ADMINISTRADOR";

  if (!possuiAcessoAdministrativo) {
    return resposta.status(403).json({
      mensagem: "Acesso à administração de funcionários não autorizado.",
    });
  }
  return proximo();
}
