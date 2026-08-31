import { z } from "zod";

export const UNIDADES_MEDIDA = ["Unidade", "Kg", "Litro", "Pacote", "Fatia"];
export const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"];
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

const identificador = z.string().regex(/^\d+$/, "Identificador inválido.");
const textoOpcional = z.union([z.string().trim().max(5000), z.null()]).optional();
const caminhoImagem = z.union([
  z.string().regex(
    /^temporarios\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$/i,
    "Caminho da imagem inválido.",
  ),
  z.null(),
]).optional();

const camposProduto = {
  nome: z.string().trim().min(2, "Nome deve possuir pelo menos 2 caracteres.").max(255),
  descricao: textoOpcional,
  idCategoria: z.coerce.number().int().positive("Categoria inválida."),
  precoUnitario: z.coerce.number().finite().min(0, "Preço não pode ser negativo."),
  unidadeMedida: z.enum(UNIDADES_MEDIDA, { errorMap: () => ({ message: "Unidade de medida inválida." }) }),
  multiploMinimo: z.coerce.number().int().positive("Múltiplo mínimo deve ser maior que zero."),
  tempoPreparoMinutos: z.coerce.number().int().min(0, "Tempo de preparo não pode ser negativo."),
  ativo: z.boolean(),
  caminhoImagem,
};

const estrutura = (corpo, parametros = z.object({}), consulta = z.object({})) =>
  z.object({ corpo, parametros, consulta });

export const criarProdutoSchema = estrutura(z.object(camposProduto).strict());
export const substituirProdutoSchema = estrutura(
  z.object(camposProduto).strict(),
  z.object({ id: identificador }),
);
export const atualizarProdutoSchema = estrutura(
  z.object(camposProduto).partial().strict().refine(
    (corpo) => Object.keys(corpo).length > 0,
    "Informe ao menos um campo para alteração.",
  ),
  z.object({ id: identificador }),
);
export const consultarProdutoSchema = estrutura(
  z.any(),
  z.object({ id: identificador }),
);
export const listarProdutosSchema = estrutura(
  z.any(),
  z.object({}),
  z.object({
    busca: z.string().trim().max(255).optional(),
    idCategoria: z.coerce.number().int().positive().optional(),
    ativo: z.enum(["true", "false"]).transform((valor) => valor === "true").optional(),
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
);

export const autorizarUploadSchema = estrutura(z.object({
  nomeArquivo: z.string().trim().min(1).max(255),
  tipoMime: z.enum(TIPOS_IMAGEM, { errorMap: () => ({ message: "Formato de imagem inválido." }) }),
  tamanho: z.number().int().positive().max(TAMANHO_MAXIMO_IMAGEM, "Imagem deve possuir no máximo 5 MB."),
}).strict());
