import { prisma } from "../database/prisma.js";

function serializar(usuario) {
    return usuario ? { ...usuario, permissoes: usuario.permissoes_funcionario.map((permissao) => permissao.modulo) } : null;
}

export class UsuarioRepository {

    async buscarPorAutenticacaoSupabase(idAutenticacaoSupabase) {
        const usuario = await prisma.usuarios.findFirst({
            where: { id_autenticacao_supabase: idAutenticacaoSupabase, ativo: true, item_ativo: true, deletado_em: null },

            include: { permissoes_funcionario: { where: { item_ativo: true, deletado_em: null } } }
        }

        );
        return serializar(usuario);

    }

}