import { createPublicKey } from "node:crypto";
import jwt from "jsonwebtoken";
import { ambiente } from "../config/ambiente.js";

const DURACAO_CACHE_JWKS_MS = 10 * 60 * 1000;

let cacheJwks = null;
let cacheValidoAte = 0;

async function obterJwksSupabase({ ignorarCache = false } = {}) {
  if (!ignorarCache && cacheJwks && Date.now() < cacheValidoAte) {
    return cacheJwks;
  }

  const resposta = await fetch(
    `${ambiente.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    { signal: AbortSignal.timeout(5000) },
  );

  if (!resposta.ok) {
    throw new Error("Não foi possível consultar as chaves do Supabase.");
  }

  const conteudo = await resposta.json();
  if (!Array.isArray(conteudo?.keys)) {
    throw new Error("Resposta de chaves do Supabase inválida.");
  }

  cacheJwks = conteudo;
  cacheValidoAte = Date.now() + DURACAO_CACHE_JWKS_MS;
  return conteudo;
}

function buscarChaveNoJwks(jwks, identificadorChave) {
  return jwks.keys.find(
    (chave) =>
      chave.kid === identificadorChave &&
      chave.alg === "ES256" &&
      chave.kty === "EC" &&
      (!chave.key_ops || chave.key_ops.includes("verify")),
  );
}

async function obterChavePublicaEs256(identificadorChave, obterJwks) {
  let jwks = await obterJwks();
  let chave = buscarChaveNoJwks(jwks, identificadorChave);

  if (!chave) {
    jwks = await obterJwks({ ignorarCache: true });
    chave = buscarChaveNoJwks(jwks, identificadorChave);
  }

  if (!chave) {
    throw new Error("Chave de assinatura do Supabase não encontrada.");
  }

  return createPublicKey({ key: chave, format: "jwk" });
}

export async function verificarTokenSupabase(
  tokenSupabase,
  { obterJwks = obterJwksSupabase } = {},
) {
  const tokenDecodificado = jwt.decode(tokenSupabase, { complete: true });
  const algoritmo = tokenDecodificado?.header?.alg;
  const emissor = `${ambiente.SUPABASE_URL}/auth/v1`;

  if (algoritmo === "HS256") {
    return jwt.verify(tokenSupabase, ambiente.SUPABASE_JWT_SECRET, {
      algorithms: ["HS256"],
      audience: "authenticated",
      issuer: emissor,
    });
  }

  if (algoritmo === "ES256") {
    const identificadorChave = tokenDecodificado?.header?.kid;
    if (typeof identificadorChave !== "string" || !identificadorChave) {
      throw new Error("Token sem identificador de chave.");
    }

    const chavePublica = await obterChavePublicaEs256(
      identificadorChave,
      obterJwks,
    );

    return jwt.verify(tokenSupabase, chavePublica, {
      algorithms: ["ES256"],
      audience: "authenticated",
      issuer: emissor,
    });
  }

  throw new Error("Algoritmo de assinatura não permitido.");
}
