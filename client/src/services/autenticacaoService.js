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

async function obterSessao() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error("Erro ao obter sessão");
  }

  const sessao = data.session;
  const usuario = data.session?.user;
  if (!sessao) {
    return { sessao: null, usuario: null };
  }

  return { sessao, usuario };
}

function acompanharAutenticacao(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    const usuario = sessao?.user ?? null;
    
    callback(sessao, usuario);
  });

  return data.subscription;
}

async function sair() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Não foi possível sair do sistema");
  }
}

export { entrar, obterSessao, acompanharAutenticacao, sair };
