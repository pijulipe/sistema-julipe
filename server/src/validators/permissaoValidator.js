import { z } from "zod";

export const consultarCatalogoModulosSchema = z.object({
  corpo: z.any(),
  parametros: z.object({}).strict(),
  consulta: z.object({}).strict(),
});
