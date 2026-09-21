export const formatarCentavos = (valor) => (Number(valor || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
