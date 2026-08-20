import jwt from "jsonwebtoken";
import { ambiente } from "../config/ambiente.js";
import { ErroAplicacao } from "../utils/erroAplicacao.js";

export class AutenticacaoService {
    constructor(usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    async entrar(tokenSupabase) {
        let payload;
        try {
            payload = jwt.verify(tokenSupabase, ambiente.SUPABASE_JWT_SECRET, { algorithms: ["HS256"] });
        } catch { throw new ErroAplicacao("Token do Supabase inválido ou expirado.", 401); }

        const idAutenticacaoSupabase = payload.sub;

        const usuario = await this.usuarioRepository.buscarPorAutenticacaoSupabase(idAutenticacaoSupabase);
        if (!usuario) throw new ErroAplicacao("Não há funcionário vinculado a essa conta.", 401);

        const token = jwt.sign(
            { sub: usuario.id_usuario, perfilAcesso: usuario.perfil_acesso, permissoes: usuario.permissoes },
            ambiente.JWT_SECRET,
            { algorithm: "HS256", expiresIn: "8h" }
        );
        return token;
    }
}

