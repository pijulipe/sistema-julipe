import { createClient } from "@supabase/supabase-js";
import { trocarTokenSupabase } from "./autenticacaoService.js";

export async function comSessaoGerente(email, senha, executar) {
  const cliente = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "julipe-autorizacao-temporaria" },
  });
  try {
    const { data, error } = await cliente.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) throw new Error("Credenciais do gerente inválidas.");
    const token = await trocarTokenSupabase(data.session.access_token);
    return await executar(token);
  } finally { await cliente.auth.signOut({ scope: "local" }); }
}
