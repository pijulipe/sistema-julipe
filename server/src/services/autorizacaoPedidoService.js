import jwt from "jsonwebtoken";
import { ErroAplicacao } from "../utils/erroAplicacao.js";
export class AutorizacaoPedidoService {
  constructor(segredo) { this.segredo = segredo; }
  emitir(dados) { return jwt.sign(dados, this.segredo, { algorithm: "HS256", expiresIn: "10m", audience: "autorizacao-pedido", issuer: "julipe" }); }
  validar(token, idSolicitante, assinatura) {
    try {
      const dados = jwt.verify(token, this.segredo, { algorithms: ["HS256"], audience: "autorizacao-pedido", issuer: "julipe" });
      if (dados.idSolicitante !== idSolicitante || dados.assinatura !== assinatura) throw new Error();
      return dados;
    } catch { throw new ErroAplicacao("Autorização expirada ou incompatível com esta versão.", 409); }
  }
}
