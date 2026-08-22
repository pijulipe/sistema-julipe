export const perfisAcessoValidos = Object.freeze([
  "ATENDENTE",
  "ADMINISTRADOR",
  "GERENTE",
]);

export function perfilAcessoValido(perfilAcesso) {
  return perfisAcessoValidos.includes(perfilAcesso);
}
