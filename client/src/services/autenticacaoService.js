import { supabase } from "../config/supabase.js";

async function entrar({ email, senha }) {
  const emailNormalizado = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailNormalizado,
    password: senha,
  });

  if (error) {
    throw new Error("E-mail ou senha inválidos");
  }

  const sessao = data.session;
  const usuario = data.user;
  if (!sessao || !usuario) {
    throw new Error("Não foi possível iniciar a sessão");
  }

  return { sessao, usuario };
}

export { entrar };
