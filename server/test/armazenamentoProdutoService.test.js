import test from "node:test";
import assert from "node:assert/strict";
import { ArmazenamentoProdutoService } from "../src/services/armazenamentoProdutoService.js";

test("rejeita extensão incompatível com MIME antes de acessar o Storage", async () => {
  const servico = new ArmazenamentoProdutoService();
  await assert.rejects(
    () => servico.autorizarUpload({ nomeArquivo: "foto.png", tipoMime: "image/jpeg" }),
    { status: 422, message: "Extensão incompatível com o tipo MIME informado." },
  );
});
