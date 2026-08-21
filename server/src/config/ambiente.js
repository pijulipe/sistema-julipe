import "dotenv/config";
import { z } from "zod";

const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve possuir pelo menos 32 caracteres."),
  SUPABASE_JWT_SECRET: z.string().min(32, "SUPABASE_JWT_SECRET é obrigatório e deve possuir pelo menos 32 caracteres."),
  SUPABASE_URL: z.string().url("SUPABASE_URL deve ser uma URL válida."),
  PORTA: z.coerce.number().int().positive().default(3000),
  ORIGENS_PERMITIDAS: z.string().default("http://localhost:5173"),
});

const resultado = esquemaAmbiente.safeParse(process.env);

if (!resultado.success) {
  const mensagens = resultado.error.issues.map((erro) => erro.message).join(" ");
  throw new Error(`Configuração de ambiente inválida: ${mensagens}`);
}

export const ambiente = {
  ...resultado.data,
  SUPABASE_URL: resultado.data.SUPABASE_URL.replace(/\/$/, ""),
  origensPermitidas: resultado.data.ORIGENS_PERMITIDAS.split(",")
    .map((origem) => origem.trim())
    .filter(Boolean),
};
