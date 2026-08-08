export class ErroAplicacao extends Error {
  constructor(mensagem, status = 400, detalhes) {
    super(mensagem);
    this.name = "ErroAplicacao";
    this.status = status;
    this.detalhes = detalhes;
  }
}
