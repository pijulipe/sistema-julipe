import jwt from "jsonwebtoken";
import { ambiente } from "../config/ambiente.js";
import { ErroAplicacao } from "../utils/erroAplicacao.js";
import { z } from "zod";
import { verificarTokenSupabase } from "../utils/verificarTokenSupabase.js";

const conteudoTokenSupabaseSchema = z.object({
  sub: z.string().uuid(),
});

export class AutenticacaoService {
  constructor(usuarioRepository, opcoesVerificacaoToken = {}) {
    this.usuarioRepository = usuarioRepository;
    this.opcoesVerificacaoToken = opcoesVerificacaoToken;
  }

  async entrar(tokenSupabase) {
    let payload;
    try {
      payload = await verificarTokenSupabase(
        tokenSupabase,
        this.opcoesVerificacaoToken,
      );
    } catch {
      throw new ErroAplicacao("Token do Supabase inválido ou expirado.", 401);
    }

    const resultadoValidacao = conteudoTokenSupabaseSchema.safeParse(payload);

    if (!resultadoValidacao.success) {
      throw new ErroAplicacao("Token do Supabase inválido ou expirado.", 401);
    }

    const idAutenticacaoSupabase = resultadoValidacao.data.sub;

    const usuario = await this.usuarioRepository.buscarPorAutenticacaoSupabase(
      idAutenticacaoSupabase,
    );
    if (!usuario)
      throw new ErroAplicacao(
        "Não há funcionário vinculado a essa conta.",
        401,
      );

    const token = jwt.sign(
      {
        sub: usuario.idUsuario,
        perfilAcesso: usuario.perfilAcesso,
        permissoes: usuario.permissoes,
      },
      ambiente.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "8h" },
    );
    return token;
  }
}
