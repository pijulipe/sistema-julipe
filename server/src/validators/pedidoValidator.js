import { z } from "zod";
import { dataValida } from "../services/agendamentoPedido.js";

const dinheiro = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Informe um valor decimal com até duas casas.");
const id = z.string().regex(/^[1-9]\d{0,17}$/);
const texto = z.string().trim().max(5000);
const endereco = z.object(Object.fromEntries(["rua", "numero", "bairro", "complemento", "pontoReferencia", "cep", "cidade", "estado"].map((campo) => [campo, z.string().trim().max(255).default("")]))).strict();
export const dadosPedido = z.object({
  idCliente: id,
  codigoComanda: z.string().trim().max(50).default(""),
  tipoEntrega: z.enum(["ENTREGA", "RETIRADA", "CONSUMO_LOCAL"]),
  dataEntrega: z.string().refine(dataValida, "Data inválida."),
  horarioEntrega: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endereco,
  observacoes: texto.default(""),
  detalhesPersonalizacao: texto.default(""),
  itens: z.array(z.object({
    chaveItem: z.string().uuid(), tipo: z.enum(["PRODUTO", "COMBO"]), idCadastro: id.refine((valor) => BigInt(valor) <= 2147483647n, "Cadastro inválido."),
    quantidade: z.number().int().positive().max(1000000), observacoes: texto.default(""),
    foto: z.string().regex(/^referencias\/[a-f0-9-]+\.(png|jpg|webp)$/).nullable().default(null),
  }).strict()).min(1).max(100).refine((itens) => new Set(itens.map((i) => i.chaveItem)).size === itens.length, "Identificadores de itens repetidos.").refine((itens) => itens.filter((i) => i.foto).length <= 10, "Máximo de 10 itens com foto."),
  desconto: z.object({ percentual: dinheiro.default("0"), valorFixo: dinheiro.default("0"), ordem: z.enum(["PERCENTUAL_PRIMEIRO", "FIXO_PRIMEIRO"]).default("PERCENTUAL_PRIMEIRO"), motivo: texto.default("") }).strict(),
}).strict().superRefine((dados, contexto) => {
  if (dados.tipoEntrega === "ENTREGA") for (const campo of ["rua", "numero", "bairro", "cidade"]) {
    if (!dados.endereco[campo]) contexto.addIssue({ code: "custom", path: ["endereco", campo], message: "Campo obrigatório para entrega." });
  }
});
export const consultaPedidos = z.object({
  pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20),
  busca: z.string().max(255).default(""), status: z.enum(["RECEBIDO", "EM_PRODUCAO", "PRONTO", "EM_ROTA", "ENTREGUE", "CANCELADO"]).optional(),
  dataInicio: z.string().refine(dataValida).optional(), dataFim: z.string().refine(dataValida).optional(),
}).strict();
const base = { chaveOperacao: z.string().uuid(), revisao: z.number().int().nonnegative() };
export const corposPedido = {
  criar: z.object({ chaveOperacao: base.chaveOperacao, dados: dadosPedido, autorizacao: z.string().max(4000).optional() }).strict(),
  editar: z.object({ ...base, dados: dadosPedido }).strict(),
  status: z.object({ ...base, status: z.enum(["RECEBIDO", "EM_PRODUCAO", "PRONTO", "EM_ROTA", "ENTREGUE"]) }).strict(),
  cancelar: z.object({ ...base, motivo: texto.optional() }).strict(),
  reabrir: z.object({ ...base, dados: dadosPedido.optional() }).strict(),
  autorizar: z.object({ ...base, assinatura: z.string().length(64) }).strict(),
  pagamento: z.object({ ...base, valor: dinheiro, forma: z.enum(["DEBITO", "CREDITO", "PIX"]), situacao: z.enum(["CONFIRMADO", "REJEITADO"]), realizadoEm: z.string().datetime({ offset: true }) }).strict(),
  estorno: z.object({ ...base, valor: dinheiro, motivo: texto.optional(), idPagamento: z.string().uuid() }).strict(),
};
export const esquemaPedido = (acao) => z.object({ corpo: corposPedido[acao], parametros: z.object({ id: id.optional() }), consulta: z.object({}) });
export const consultaPedidoSchema = z.object({ corpo: z.any(), parametros: z.object({ id }), consulta: z.object({}) });
export const listaPedidoSchema = z.object({ corpo: z.any(), parametros: z.object({}), consulta: consultaPedidos });
export const historicoPedidoSchema = z.object({ corpo: z.any(), parametros: z.object({ id }), consulta: z.object({ pagina: z.coerce.number().int().positive().default(1) }).strict() });
export const previaPedidoSchema = z.object({ corpo: z.object({ dados: dadosPedido, idPedido: id.optional() }).strict(), parametros: z.object({}), consulta: z.object({}) });
const envelopeFoto = (corpo) => z.object({ corpo, parametros: z.object({}), consulta: z.object({}) });
export const autorizacaoNovoPedidoSchema = envelopeFoto(z.object({ idSolicitante: z.string().uuid(), chaveOperacao: z.string().uuid(), dados: dadosPedido }).strict());
export const uploadFotoPedidoSchema = envelopeFoto(z.object({ tipoMime: z.enum(["image/png", "image/jpeg", "image/webp"]), tamanho: z.number().int().positive().max(5242880) }).strict());
export const confirmarFotoPedidoSchema = envelopeFoto(z.object({ caminho: z.string().regex(/^referencias\/[a-f0-9-]+\.(png|jpg|webp)$/) }).strict());
export const fotosPedidoSchema = z.object({ corpo: z.any(), parametros: z.object({ id }), consulta: z.object({ versao: z.coerce.number().int().positive().optional() }).strict() });
export const vendaPedidoSchema = z.object({ corpo: z.any(), parametros: z.object({}), consulta: z.object({ busca: z.string().max(255).default("") }).strict() });
