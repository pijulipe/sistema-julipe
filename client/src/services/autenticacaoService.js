import { supabase } from "../config/supabase.js";
import { urlDaApi } from "../config/api.js";

async function trocarTokenSupabase(tokenSupabase) {
  const resposta = await fetch(`${urlDaApi}/api/autenticacao/entrar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tokenSupabase }),
  });

  const conteudo = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      conteudo?.mensagem || "Não foi possível validar o acesso no servidor.",
    );
  }

  const tokenInterno = conteudo?.dados?.token;

  if (typeof tokenInterno !== "string" || tokenInterno.trim() === "") {
    throw new Error("Resposta de autenticação inválida.");
  }

  return tokenInterno;
}

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

  let tokenInterno;
  try {
    tokenInterno = await trocarTokenSupabase(sessao.access_token);
  } catch (erro) {
    await supabase.auth.signOut();
    throw erro;
  }

  return { sessao, usuario, tokenInterno };
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

  let tokenInterno;
  try {
    tokenInterno = await trocarTokenSupabase(sessao.access_token);
  } catch (erro) {
    await supabase.auth.signOut();
    throw erro;
  }

  return { sessao, usuario, tokenInterno };
}

function acompanharAutenticacao(callback) {
  const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
    const usuario = sessao?.user ?? null;

    callback(evento, sessao, usuario);
  });

  return data.subscription;
}

async function sair() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Não foi possível sair do sistema");
  }
}

export {
  entrar,
  obterSessao,
  acompanharAutenticacao,
  sair,
  trocarTokenSupabase,
};
