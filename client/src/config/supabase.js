import { createClient } from "@supabase/supabase-js";

const urlDoSupabase = import.meta.env.VITE_SUPABASE_URL;
const chaveAnonDoSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!urlDoSupabase || !chaveAnonDoSupabase) {
  throw new Error(
    "Configuração de ambiente inválida: Erro ao acessar Supabase",
  );
}

const supabase = createClient(urlDoSupabase, chaveAnonDoSupabase);

export { supabase };