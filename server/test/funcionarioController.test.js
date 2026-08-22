import test from "node:test";
import assert from "node:assert/strict";
import { FuncionarioController } from "../src/controllers/funcionarioController.js";

function criarResposta() {
  return {
    statusRecebido: null,
    corpoRecebido: null,
    status(status) {
      this.statusRecebido = status;
      return this;
    },
    json(corpo) {
      this.corpoRecebido = corpo;
      return this;
    },
  };
}

test("controller lista funcionários com a consulta validada", async () => {
  const consulta = { pagina: 1, limite: 20 };
  const resultado = { dados: [], paginacao: { pagina: 1, limite: 20 } };
  const controller = new FuncionarioController({
    listar: async (entrada) => {
      assert.equal(entrada, consulta);
      return resultado;
    },
  });
  const resposta = criarResposta();

  await controller.listar({ dadosValidados: { consulta } }, resposta);

  assert.equal(resposta.statusRecebido, 200);
  assert.equal(resposta.corpoRecebido, resultado);
});

test("controller consulta funcionário com identificador e autor atuais", async () => {
  const autor = { idUsuario: "gerente-1", perfilAcesso: "GERENTE" };
  const funcionario = { idUsuario: "atendente-1", perfilAcesso: "ATENDENTE" };
  const controller = new FuncionarioController({
    buscarPorId: async (idUsuario, autorRecebido) => {
      assert.equal(idUsuario, funcionario.idUsuario);
      assert.equal(autorRecebido, autor);
      return funcionario;
    },
  });
  const resposta = criarResposta();

  await controller.buscarPorId(
    {
      usuario: autor,
      dadosValidados: { parametros: { id: funcionario.idUsuario } },
    },
    resposta,
  );

  assert.equal(resposta.statusRecebido, 200);
  assert.deepEqual(resposta.corpoRecebido, { dados: funcionario });
});

test("controller substitui permissões com os dados validados", async () => {
  const autor = { idUsuario: "gerente-1", perfilAcesso: "GERENTE" };
  const idUsuario = "atendente-1";
  const modulos = ["PEDIDOS", "CLIENTES"];
  const resultado = { idUsuario, permissoes: modulos };
  const controller = new FuncionarioController({
    substituirPermissoes: async (autorRecebido, idRecebido, modulosRecebidos) => {
      assert.equal(autorRecebido, autor);
      assert.equal(idRecebido, idUsuario);
      assert.equal(modulosRecebidos, modulos);
      return resultado;
    },
  });
  const resposta = criarResposta();

  await controller.substituirPermissoes(
    {
      usuario: autor,
      dadosValidados: { parametros: { id: idUsuario }, corpo: { modulos } },
    },
    resposta,
  );

  assert.equal(resposta.statusRecebido, 200);
  assert.deepEqual(resposta.corpoRecebido, {
    mensagem: "Permissões atualizadas com sucesso.",
    dados: resultado,
  });
});

test("controller altera perfil com os dados validados", async () => {
  const autor = { idUsuario: "gerente-1", perfilAcesso: "GERENTE" };
  const idUsuario = "atendente-1";
  const perfilAcesso = "ADMINISTRADOR";
  const resultado = { idUsuario, perfilAcesso };
  const controller = new FuncionarioController({
    alterarPerfil: async (autorRecebido, idRecebido, perfilRecebido) => {
      assert.equal(autorRecebido, autor);
      assert.equal(idRecebido, idUsuario);
      assert.equal(perfilRecebido, perfilAcesso);
      return resultado;
    },
  });
  const resposta = criarResposta();

  await controller.alterarPerfil(
    {
      usuario: autor,
      dadosValidados: {
        parametros: { id: idUsuario },
        corpo: { perfilAcesso },
      },
    },
    resposta,
  );

  assert.equal(resposta.statusRecebido, 200);
  assert.deepEqual(resposta.corpoRecebido, {
    mensagem: "Perfil de acesso atualizado com sucesso.",
    dados: resultado,
  });
});
