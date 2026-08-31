import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../database/supabaseAdmin.js";
import { ErroAplicacao } from "../utils/erroAplicacao.js";

const BALDE = "imagens-produtos";
const EXTENSAO_POR_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class ArmazenamentoProdutoService {
  async autorizarUpload({ nomeArquivo, tipoMime }) {
    const extensaoInformada = nomeArquivo.split(".").pop()?.toLowerCase();
    const extensoesValidas = tipoMime === "image/jpeg" ? ["jpg", "jpeg"] : [EXTENSAO_POR_MIME[tipoMime]];
    if (!extensoesValidas.includes(extensaoInformada)) {
      throw new ErroAplicacao("Extensão incompatível com o tipo MIME informado.", 422);
    }

    const caminho = `temporarios/${randomUUID()}.${EXTENSAO_POR_MIME[tipoMime]}`;
    const { data, error } = await supabaseAdmin.storage.from(BALDE)
      .createSignedUploadUrl(caminho);
    if (error || !data?.token) {
      throw new ErroAplicacao("Não foi possível autorizar o envio da imagem.", 502);
    }
    return { caminhoImagem: caminho, tokenUpload: data.token };
  }

  async criarUrlLeitura(caminho) {
    if (!caminho) return null;
    const { data, error } = await supabaseAdmin.storage.from(BALDE)
      .createSignedUrl(caminho, 3600);
    return error ? null : data?.signedUrl || null;
  }

  async existe(caminho) {
    const nome = caminho.split("/").pop();
    const { data, error } = await supabaseAdmin.storage.from(BALDE)
      .list("temporarios", { search: nome, limit: 2 });
    return !error && data?.some((objeto) => objeto.name === nome);
  }

  async remover(caminho) {
    if (!caminho) return true;
    const { error } = await supabaseAdmin.storage.from(BALDE).remove([caminho]);
    return !error;
  }
}
