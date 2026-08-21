import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { app } from "../src/app.js";

test("valida requisições do endpoint de autenticação", async (contexto) => {
  const servidor = app.listen(0);
  await once(servidor, "listening");

  contexto.after(
    () =>
      new Promise((resolve, reject) => {
        servidor.close((erro) => (erro ? reject(erro) : resolve()));
      }),
  );

  const endereco = servidor.address();
  assert.equal(typeof endereco, "object");
  const url = `http://127.0.0.1:${endereco.port}/api/autenticacao/entrar`;

  async function enviar(corpo) {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    return { resposta, conteudo: await resposta.json() };
  }

  await contexto.test("rejeita corpo sem token", async () => {
    const { resposta, conteudo } = await enviar({});

    assert.equal(resposta.status, 422);
    assert.equal(conteudo.mensagem, "Dados inválidos.");
    assert.equal(Array.isArray(conteudo.erros), true);
    assert.equal(conteudo.erros.length > 0, true);
  });

  await contexto.test("rejeita token sem formato JWT", async () => {
    const { resposta, conteudo } = await enviar({
      tokenSupabase: "token-invalido",
    });

    assert.equal(resposta.status, 422);
    assert.equal(conteudo.mensagem, "Dados inválidos.");
    assert.equal(
      conteudo.erros.some((erro) => erro.campo === "corpo.tokenSupabase"),
      true,
    );
  });

  await contexto.test("rejeita JWT estruturalmente válido com conteúdo inválido", async () => {
    const { resposta, conteudo } = await enviar({
      tokenSupabase: "parte.parte.parte",
    });

    assert.equal(resposta.status, 401);
    assert.deepEqual(conteudo, {
      mensagem: "Token do Supabase inválido ou expirado.",
    });
  });
});
