import { z } from "zod";

const textoOpcional = (maximo) =>
  z.union([z.string().trim().max(maximo), z.null()]).optional();

const telefone = z.string().trim().max(20)
  .regex(/^\+?[\d\s().-]+$/, "Telefone possui caracteres inválidos.")
  .refine((valor) => valor.replace(/\D/g, "").length >= 8, "Telefone inválido.");

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
  .refine((valor) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano
      && data.getUTCMonth() === mes - 1
      && data.getUTCDate() === dia;
  }, "Data de aniversário inválida.");

const camposCliente = {
  nome: z.string().trim().min(2, "Nome deve possuir pelo menos 2 caracteres.").max(255),
  telefone,
  endereco: textoOpcional(255),
  numeroEndereco: textoOpcional(20),
  bairro: textoOpcional(100),
  pontoReferencia: textoOpcional(255),
  observacoes: textoOpcional(5000),
  dataAniversario: z.union([dataIso, z.null()]).optional(),
};

const parametrosId = z.object({
  id: z.string().regex(/^\d+$/, "Identificador de cliente inválido."),
});

export const criarClienteSchema = z.object({
  corpo: z.object(camposCliente).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const substituirClienteSchema = z.object({
  corpo: z.object(camposCliente).strict(),
  parametros: parametrosId,
  consulta: z.object({}),
});

export const atualizarClienteSchema = z.object({
  corpo: z.object(camposCliente).partial().strict().refine(
    (corpo) => Object.keys(corpo).length > 0,
    "Informe ao menos um campo para alteração."
  ),
  parametros: parametrosId,
  consulta: z.object({}),
});

export const consultarClienteSchema = z.object({
  corpo: z.any(),
  parametros: parametrosId,
  consulta: z.object({}),
});

export const listarClientesSchema = z.object({
  corpo: z.any(),
  parametros: z.object({}),
  consulta: z.object({
    busca: z.string().trim().max(255).optional(),
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
});
