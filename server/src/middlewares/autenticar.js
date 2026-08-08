import jwt from "jsonwebtoken";
import { ambiente } from "../config/ambiente.js";

export function autenticar(requisicao, resposta, proximo) {
  const cabecalho = requisicao.headers.authorization;

  if (!cabecalho?.startsWith("Bearer ")) {
    return resposta.status(401).json({ mensagem: "Autenticação obrigatória." });
  }

  try {
    const token = cabecalho.slice(7);
    const conteudo = jwt.verify(token, ambiente.JWT_SECRET, { algorithms: ["HS256"] });

    if (typeof conteudo !== "object" || !conteudo.sub || !conteudo.perfilAcesso) {
      return resposta.status(401).json({ mensagem: "Token inválido." });
    }

    requisicao.usuario = {
      idUsuario: conteudo.sub,
      perfilAcesso: conteudo.perfilAcesso,
      permissoes: Array.isArray(conteudo.permissoes) ? conteudo.permissoes : [],
    };
    return proximo();
  } catch {
    return resposta.status(401).json({ mensagem: "Token inválido ou expirado." });
  }
}
