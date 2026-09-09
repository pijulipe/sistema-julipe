import { z } from "zod";
import { chavesModulos } from "../utils/modulos.js";
const horario = z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/);
const decimal = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/);
const percentual = decimal.refine((v) => Number(v) <= 100);
const envelope = (corpo, parametros = z.object({})) => z.object({ corpo, parametros, consulta: z.object({}) });
export const consultaConfiguracaoFuncionarioSchema = z.object({ corpo: z.any(), parametros: z.object({ id: z.string().uuid() }), consulta: z.object({}) });
export const configuracaoPedidoSchema = envelope(z.object({
  expediente: z.array(z.object({ diaSemana: z.number().int().min(0).max(6), aberto: z.boolean(), inicio: horario, fim: horario }).strict().refine((d) => d.inicio < d.fim)).length(7).refine((dias) => new Set(dias.map((d) => d.diaSemana)).size === 7),
  limites: z.array(z.object({ idCategoria: z.number().int().positive(), limite: z.number().int().nonnegative() }).strict()).max(100).refine((limites) => new Set(limites.map((l) => l.idCategoria)).size === limites.length),
}).strict());
export const cargoPedidoSchema = envelope(z.object({ idCargo: z.number().int().positive().optional(), nome: z.string().trim().min(1).max(100), modulos: z.array(z.enum(chavesModulos)), podeCancelarPedido: z.boolean().nullable(), limiteDesconto: percentual, limiteEstorno: decimal, ativo: z.boolean() }).strict());
export const configuracaoFuncionarioSchema = envelope(z.object({ idCargo: z.number().int().positive().nullable(), excecoesModulos: z.record(z.enum(chavesModulos), z.boolean()), cancelamentoIndividual: z.boolean().nullable(), descontoIndividual: percentual.nullable(), estornoIndividual: decimal.nullable() }).strict(), z.object({ id: z.string().uuid() }));
