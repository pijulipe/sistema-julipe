import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { app } from "../src/app.js";

test("protege os endpoints administrativos de funcionários e permissões", async (contexto) => {
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
  const baseUrl = `http://127.0.0.1:${endereco.port}`;

  const casos = [
    { metodo: "GET", caminho: "/api/funcionarios" },
    {
      metodo: "GET",
      caminho: "/api/funcionarios/00000000-0000-4000-8000-000000000000",
    },
    {
      metodo: "PUT",
      caminho:
        "/api/funcionarios/00000000-0000-4000-8000-000000000000/permissoes",
    },
    {
      metodo: "PATCH",
      caminho: "/api/funcionarios/00000000-0000-4000-8000-000000000000/perfil",
    },
    { metodo: "GET", caminho: "/api/permissoes/modulos" },
  ];

  for (const caso of casos) {
    await contexto.test(`${caso.metodo} ${caso.caminho}`, async () => {
      const resposta = await fetch(`${baseUrl}${caso.caminho}`, {
        method: caso.metodo,
        headers:
          caso.metodo === "GET" ? undefined : { "Content-Type": "application/json" },
        body: caso.metodo === "GET" ? undefined : JSON.stringify({}),
      });

      assert.equal(resposta.status, 401);
      assert.deepEqual(await resposta.json(), {
        mensagem: "Autenticação obrigatória.",
      });
    });
  }
});
