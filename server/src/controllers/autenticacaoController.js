export class AutenticacaoController {
    constructor(autenticacaoService) {
        this.autenticacaoService = autenticacaoService;
    }

    entrar = async (requisicao, resposta) => {
        const token = await this.autenticacaoService.entrar(requisicao.dadosValidados.corpo.tokenSupabase);
        return resposta.status(200).json({ mensagem: "Login realizado com sucesso.", dados: { token } });
    };
}