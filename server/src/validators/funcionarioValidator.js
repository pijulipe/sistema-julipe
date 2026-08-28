import { z } from "zod";
import { perfisAcessoValidos } from "../utils/perfisAcesso.js";
import { chavesModulos } from "../utils/modulos.js";

const parametrosIdFuncionario = z
  .object({
    id: z.string().uuid("Identificador de funcionário inválido."),
  })
  .strict();

export const criarFuncionarioSchema = z.object({
  corpo: z
    .object({
      nome: z.string().trim().min(2, "Nome deve possuir pelo menos 2 caracteres.").max(255),
      email: z.string().trim().toLowerCase().email("E-mail inválido.").max(255),
      senha: z.string().min(8, "Senha deve possuir pelo menos 8 caracteres."),
      perfilAcesso: z.enum(perfisAcessoValidos),
    })
    .strict(),
  parametros: z.object({}),
  consulta: z.object({}).strict(),
});

export const listarFuncionariosSchema = z.object({
  corpo: z.any(),
  parametros: z.object({}),
  consulta: z
    .object({
      busca: z.string().trim().max(255).optional(),
      pagina: z.coerce.number().int().positive().default(1),
      limite: z.coerce.number().int().min(1).max(100).default(20),
      perfilAcesso: z.enum(perfisAcessoValidos).optional(),
      ativo: z
        .enum(["true", "false"])
        .transform((valor) => valor === "true")
        .optional(),
    })
    .strict(),
});

export const consultarFuncionarioSchema = z.object({
  corpo: z.any(),
  parametros: parametrosIdFuncionario,
  consulta: z.object({}).strict(),
});

export const substituirPermissoesFuncionarioSchema = z.object({
  corpo: z
    .object({
      modulos: z
        .array(z.enum(chavesModulos))
        .max(chavesModulos.length)
        .refine(
          (modulos) => new Set(modulos).size === modulos.length,
          "Módulos não podem se repetir.",
        ),
    })
    .strict(),
  parametros: parametrosIdFuncionario,
  consulta: z.object({}).strict(),
});

export const alterarPerfilFuncionarioSchema = z.object({
  corpo: z
    .object({
      perfilAcesso: z.enum(perfisAcessoValidos),
    })
    .strict(),
  parametros: parametrosIdFuncionario,
  consulta: z.object({}).strict(),
});

const camposDadosCadastraisFuncionario = {
  nome: z.string().trim().min(2, "Nome deve possuir pelo menos 2 caracteres.").max(255),
  ativo: z.boolean(),
};

export const atualizarDadosCadastraisFuncionarioSchema = z.object({
  corpo: z
    .object(camposDadosCadastraisFuncionario)
    .partial()
    .strict()
    .refine(
      (corpo) => Object.keys(corpo).length > 0,
      "Informe ao menos um campo para alteração.",
    ),
  parametros: parametrosIdFuncionario,
  consulta: z.object({}).strict(),
});