import { ErroAplicacao } from "./erroAplicacao.js";
import { chavesModulos } from "./modulos.js";

export const normalizarModulo = (modulo) => String(modulo).trim().toUpperCase() === "CLIENTE" ? "CLIENTES" : String(modulo).trim().toUpperCase();
export function acessoEfetivo(usuario) {
  const cargo = usuario.cargo?.ativo ? usuario.cargo : null;
  const modulos = new Set([...(cargo?.modulos || []), ...(usuario.permissoes || [])].map(normalizarModulo));
  for (const [modulo, conceder] of Object.entries(usuario.excecoesModulos || {})) {
    if (conceder) modulos.add(normalizarModulo(modulo));
    else modulos.delete(normalizarModulo(modulo));
  }
  return {
    ...usuario, permissoes: [...modulos].filter((m) => chavesModulos.includes(m)),
    podeCancelarPedido: usuario.perfilAcesso === "GERENTE" || (usuario.cancelamentoIndividual ?? cargo?.podeCancelarPedido ?? usuario.perfilAcesso === "ADMINISTRADOR"),
    limiteDesconto: String(usuario.descontoIndividual ?? cargo?.limiteDesconto ?? "0"),
    limiteEstorno: String(usuario.estornoIndividual ?? cargo?.limiteEstorno ?? "0"),
  };
}
export function possuiModulo(usuario, modulo) {
  return usuario.perfilAcesso === "GERENTE" || usuario.permissoes?.includes(normalizarModulo(modulo));
}
export function exigirModuloPedido(usuario) {
  if (!possuiModulo(usuario, "PEDIDOS")) throw new ErroAplicacao("Acesso a Pedidos necessário.", 403);
}
export function autorizarStatus(usuario, anterior, novo) {
  if (["ENTREGUE", "CANCELADO"].includes(anterior)) throw new ErroAplicacao("Reabra o pedido antes de mudar o status.", 409);
  if (novo === "CANCELADO") {
    exigirModuloPedido(usuario);
    if (!usuario.podeCancelarPedido && usuario.perfilAcesso !== "GERENTE") throw new ErroAplicacao("Cancelamento não autorizado.", 403);
    return;
  }
  const operacionais = ["RECEBIDO", "EM_PRODUCAO", "PRONTO", "EM_ROTA", "ENTREGUE"];
  if (!operacionais.includes(novo)) throw new ErroAplicacao("Status inválido.", 422);
  if (possuiModulo(usuario, "PEDIDOS") || possuiModulo(usuario, "EXPEDICAO")) return;
  if (possuiModulo(usuario, "PRODUCAO") && ["RECEBIDO", "EM_PRODUCAO", "PRONTO"].includes(novo)) return;
  throw new ErroAplicacao("Mudança de status não autorizada.", 403);
}
