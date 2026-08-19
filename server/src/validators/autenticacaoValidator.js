import { z } from "zod";

const formatoJWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]$/

const camposAutenticacao = { tokenSupabase: z.string().trim().nonempty("token é obrigatório").regex(formatoJWT, "formato do token inválido") }

export const entrarSchema = z.object({
    corpo: z.object(camposAutenticacao).strict(),
    parametros: z.object({}),
    consulta: z.object({}),
});