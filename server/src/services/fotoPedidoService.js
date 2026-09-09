import { randomUUID } from "node:crypto";
import { ErroAplicacao } from "../utils/erroAplicacao.js";
import { exigirModuloPedido } from "../utils/acessoPedido.js";

const extensoes = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export function validarBytesFoto(bytes, extensao) {
  if (bytes.length > 5242880 || bytes.length < 12) throw new ErroAplicacao("Foto deve ter até 5 MB e conteúdo válido.", 422);
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!({ png, jpg, webp })[extensao]) throw new ErroAplicacao("Conteúdo da foto incompatível com o formato informado.", 422);
}
export class FotoPedidoService {
  constructor(repository, armazenamento) { this.repository = repository; this.armazenamento = armazenamento; }
  async autorizar({ tipoMime, tamanho }, usuario) {
    exigirModuloPedido(usuario);
    if (!extensoes[tipoMime] || !Number.isSafeInteger(tamanho) || tamanho <= 0 || tamanho > 5242880) throw new ErroAplicacao("Envie PNG, JPEG ou WebP de até 5 MB.", 422);
    const caminho = `referencias/${randomUUID()}.${extensoes[tipoMime]}`;
    const temporario = caminho.replace("referencias/", "temporarios/");
    await this.repository.criar(caminho, usuario.idUsuario);
    const { data, error } = await this.armazenamento.createSignedUploadUrl(temporario);
    if (error || !data?.signedUrl) throw new ErroAplicacao("Não foi possível autorizar upload.", 502);
    return { caminho, urlUpload: data.signedUrl };
  }
  async confirmar(caminho, usuario) {
    exigirModuloPedido(usuario);
    const registro = await this.repository.buscar(caminho);
    if (!registro || registro.idAutor !== usuario.idUsuario) throw new ErroAplicacao("Upload não encontrado.", 404);
    if (registro.confirmada) return { caminho };
    const temporario = caminho.replace("referencias/", "temporarios/");
    let { data, error } = await this.armazenamento.download(temporario);
    let jaMovida = false;
    if (error || !data) {
      const final = await this.armazenamento.download(caminho);
      if (final.error || !final.data) throw new ErroAplicacao("Envio ainda não concluído. Repita a confirmação.", 422);
      data = final.data;
      jaMovida = true;
    }
    validarBytesFoto(Buffer.from(await data.arrayBuffer()), caminho.split(".").pop());
    if (!jaMovida) {
      const resultado = await this.armazenamento.move(temporario, caminho);
      if (resultado.error) throw new ErroAplicacao("Não foi possível confirmar a foto.", 502);
    }
    await this.repository.confirmar(caminho);
    return { caminho };
  }
  async urls(fotografia) {
    if (!fotografia) return fotografia;
    return { ...fotografia, itens: await Promise.all(fotografia.itens.map(async (item) => {
      if (!item.foto) return item;
      const { data, error } = await this.armazenamento.createSignedUrl(item.foto, 900);
      return { ...item, urlFoto: error ? null : data?.signedUrl };
    })) };
  }
  async limpar() {
    for (const { caminho } of await this.repository.orfaos()) {
      await this.repository.limparOrfao(caminho, async () => {
        const { error } = await this.armazenamento.remove([caminho, caminho.replace("referencias/", "temporarios/")]);
        return !error;
      });
    }
  }
}
