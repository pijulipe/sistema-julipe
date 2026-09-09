import test from "node:test";
import assert from "node:assert/strict";
import { FotoPedidoService, validarBytesFoto } from "../src/services/fotoPedidoService.js";

const usuario = { idUsuario: "autor", perfilAcesso: "ATENDENTE", permissoes: ["PEDIDOS"] };
const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
test("fotos rejeitam extensão falsa, excesso de tamanho e acesso sem Pedidos", async () => {
  assert.doesNotThrow(() => validarBytesFoto(png, "png"));
  assert.throws(() => validarBytesFoto(png, "jpg"), (e) => e.status === 422);
  assert.throws(() => validarBytesFoto(Buffer.alloc(5242881), "png"), (e) => e.status === 422);
  const servico = new FotoPedidoService({}, {});
  await assert.rejects(servico.autorizar({ tipoMime: "image/png", tamanho: 16 }, { ...usuario, permissoes: ["PRODUCAO"] }), (e) => e.status === 403);
  await assert.rejects(servico.autorizar({ tipoMime: "image/svg+xml", tamanho: 16 }, usuario), (e) => e.status === 422);
});
test("confirmação valida proprietário e recupera falha após mover objeto", async () => {
  let confirmada = false;
  const caminho = "referencias/teste.png";
  const repository = {
    buscar: async () => ({ idAutor: usuario.idUsuario, confirmada }),
    confirmar: async () => { confirmada = true; },
  };
  const armazenamento = {
    download: async (nome) => nome.startsWith("temporarios/") ? { error: true } : { data: new Blob([png]) },
    move: async () => { assert.fail("Objeto definitivo não deve ser movido novamente."); },
  };
  const servico = new FotoPedidoService(repository, armazenamento);
  await assert.rejects(servico.confirmar(caminho, { ...usuario, idUsuario: "outro" }), (e) => e.status === 404);
  assert.deepEqual(await servico.confirmar(caminho, usuario), { caminho });
  assert.equal(confirmada, true);
  assert.deepEqual(await servico.confirmar(caminho, usuario), { caminho });
});
test("URL de leitura expira e falha de Storage não expõe caminho público", async () => {
  const servico = new FotoPedidoService({}, { createSignedUrl: async (caminho, validade) => {
    assert.equal(validade, 900);
    assert.equal(caminho, "referencias/teste.png");
    return { error: true };
  } });
  const resultado = await servico.urls({ itens: [{ foto: "referencias/teste.png" }] });
  assert.equal(resultado.itens[0].urlFoto, null);
});
