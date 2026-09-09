import { ErroAplicacao } from "../utils/erroAplicacao.js";

const falhar = (mensagem) => { throw new ErroAplicacao(mensagem, 422); };

/** Converte decimal monetário sem executar multiplicação em ponto flutuante. */
export function paraCentavos(valor) {
  const texto = String(valor);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(texto)) falhar("Valor monetário inválido; use até duas casas decimais.");
  const [inteiro, fracao = ""] = texto.split(".");
  return BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
}

export function decimalMonetario(centavos) {
  const valor = BigInt(centavos);
  return `${valor / 100n}.${String(valor % 100n).padStart(2, "0")}`;
}

export function calcularDesconto(subtotal, { percentual = "0", valorFixo = "0", ordem = "PERCENTUAL_PRIMEIRO" } = {}) {
  subtotal = BigInt(subtotal);
  const pontos = paraCentavos(percentual);
  const fixo = paraCentavos(valorFixo);
  if (subtotal <= 0n || pontos >= 10000n || fixo >= subtotal) falhar("O pedido deve ter total maior que zero e desconto inferior a 100%.");
  if (!["PERCENTUAL_PRIMEIRO", "FIXO_PRIMEIRO"].includes(ordem)) falhar("Ordem de desconto inválida.");
  const base = ordem === "FIXO_PRIMEIRO" ? subtotal - fixo : subtotal;
  const componentePercentual = (base * pontos + 5000n) / 10000n;
  const desconto = componentePercentual + fixo;
  const total = subtotal - desconto;
  if (total <= 0n) falhar("O pedido deve ter total maior que zero.");
  if (subtotal > 9999999999n) falhar("Subtotal ultrapassa o valor máximo suportado por pedido (R$ 99.999.999,99).");
  return { subtotalCentavos: String(subtotal), descontoCentavos: String(desconto), totalCentavos: String(total), componentePercentualCentavos: String(componentePercentual) };
}

export function exigeAutorizacao(calculo, limitePercentual) {
  return BigInt(calculo.descontoCentavos) * 10000n > BigInt(calculo.subtotalCentavos) * paraCentavos(limitePercentual ?? "0");
}

export function calcularItem(item, cadastro) {
  const quantidade = Number(item.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0) falhar("Quantidade deve ser inteira e positiva.");
  const multiplo = item.tipo === "PRODUTO" ? Number(cadastro.multiploMinimo) : 1;
  if (!Number.isSafeInteger(multiplo) || multiplo <= 0 || quantidade % multiplo !== 0) {
    falhar(`Escolha uma quantidade válida para ${cadastro.nome}, múltipla de ${multiplo}.`);
  }
  const preco = paraCentavos(cadastro.preco);
  const composicao = item.tipo === "COMBO" ? cadastro.composicao : [{
    idProduto: cadastro.id, nome: cadastro.nome, idCategoria: cadastro.idCategoria, categoria: cadastro.nomeCategoria || null, quantidade: 1,
  }];
  if (!composicao?.length) falhar("Combo sem composição válida.");
  return {
    ...item, nome: cadastro.nome, multiploMinimo: multiplo,
    precoPacoteCentavos: String(preco), subtotalCentavos: String(preco * BigInt(quantidade / multiplo)),
    versaoCatalogo: cadastro.versao ?? null, composicao,
  };
}

export function calcularFinanceiro(total, pagamentos) {
  let recebidos = 0n;
  let estornados = 0n;
  for (const pagamento of pagamentos) {
    if (pagamento.situacao === "REJEITADO") continue;
    recebidos += BigInt(pagamento.valorCentavos);
    estornados += (pagamento.estornos || []).reduce((soma, estorno) => soma + BigInt(estorno.valorCentavos), 0n);
  }
  const liquido = recebidos - estornados;
  if (liquido < 0n) falhar("Estornos ultrapassam os recebimentos.");
  return {
    recebidoCentavos: String(recebidos), estornadoCentavos: String(estornados), liquidoCentavos: String(liquido),
    excedenteCentavos: String(liquido > BigInt(total) ? liquido - BigInt(total) : 0n),
    situacao: liquido === 0n ? "PENDENTE" : liquido < BigInt(total) ? "PARCIAL" : "PAGO",
  };
}

export function validarEstorno(pagamento, valor, usuario) {
  const centavos = paraCentavos(valor);
  if (centavos <= 0n || pagamento.situacao === "REJEITADO") falhar("Pagamento não admite este estorno.");
  const acumulado = (pagamento.estornos || []).reduce((soma, estorno) => soma + BigInt(estorno.valorCentavos), 0n) + centavos;
  if (acumulado > BigInt(pagamento.valorCentavos)) falhar("Estorno ultrapassa o saldo do pagamento.");
  if (usuario.perfilAcesso !== "GERENTE" && acumulado > paraCentavos(usuario.limiteEstorno ?? "0")) {
    throw new ErroAplicacao("Estorno acumulado ultrapassa seu limite.", 403);
  }
  return String(centavos);
}

export function calcularCapacidade(pedidos) {
  const totais = {};
  for (const pedido of pedidos) {
    if (["ENTREGUE", "CANCELADO"].includes(pedido.status)) continue;
    const fotografia = pedido.fotografia;
    for (const item of fotografia.itens) {
      for (const componente of item.composicao) {
        const chave = `${fotografia.dataEntrega}|${fotografia.horarioEntrega.slice(0, 2)}|${componente.idCategoria}`;
        totais[chave] = (totais[chave] || 0) + componente.quantidade * item.quantidade;
      }
    }
  }
  return totais;
}
