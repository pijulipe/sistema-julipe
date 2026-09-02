import { z } from "zod";

const identificador = z.string().regex(/^\d+$/, "Identificador inválido.");
const textoOpcional = z.union([z.string().trim().max(5000), z.null()]).optional();

const itemCombo = z.object({
  idProduto: z.coerce.number().int().positive("Produto inválido."),
  quantidade: z.coerce.number().finite().positive("Quantidade deve ser maior que zero."),
}).strict();

const camposCombo = {
  nome: z.string().trim().min(1, "Nome é obrigatório.").max(255),
  descricao: textoOpcional,
  preco: z.coerce.number().finite().min(0, "Preço não pode ser negativo."),
  itens: z.array(itemCombo).min(1, "Combo deve possuir ao menos um produto."),
  ativo: z.boolean(),
};

const estrutura = (corpo, parametros = z.object({}), consulta = z.object({})) =>
  z.object({ corpo, parametros, consulta });

export const criarComboSchema = estrutura(z.object(camposCombo).strict());
export const substituirComboSchema = estrutura(
  z.object(camposCombo).strict(),
  z.object({ id: identificador }),
);
export const atualizarComboSchema = estrutura(
  z.object(camposCombo).partial().strict().refine(
    (corpo) => Object.keys(corpo).length > 0,
    "Informe ao menos um campo para alteração.",
  ),
  z.object({ id: identificador }),
);
export const consultarComboSchema = estrutura(z.any(), z.object({ id: identificador }));
export const listarCombosSchema = estrutura(
  z.any(),
  z.object({}),
  z.object({
    busca: z.string().trim().max(255).optional(),
    ativo: z.enum(["true", "false"]).transform((valor) => valor === "true").optional(),
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
);
