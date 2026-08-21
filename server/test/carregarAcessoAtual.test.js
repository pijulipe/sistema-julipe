import test from "node:test";
import assert from "node:assert/strict";
import { carregarAcessoAtual } from "../src/middlewares/carregarAcessoAtual.js";
import { autorizarModulo } from "../src/middlewares/autorizarModulo.js";

test("carrega perfil e permissões atuais do funcionário", async () => {
  const idUsuario = "10bdcf59-6fbf-433a-9c78-1112b172170e";
  let idRecebido;
  let proximoChamado = false;

  const acessoAtual = {
    idUsuario,
    perfilAcesso: "ATENDENTE",
    permissoes: ["CLIENTES"],
  };

  const usuarioRepository = {
    async buscarAcessoAtualPorId(id) {
      idRecebido = id;
      return acessoAtual;
    },
  };

  const requisicao = {
    usuario: {
      idUsuario,
      perfilAcesso: "ATENDENTE",
      permissoes: ["PEDIDOS"],
    },
  };

  await carregarAcessoAtual(usuarioRepository)(requisicao, {}, () => {
    proximoChamado = true;
  });

  assert.equal(idRecebido, idUsuario);
  assert.equal(proximoChamado, true);
  assert.deepEqual(requisicao.usuario, acessoAtual);
  assert.deepEqual(requisicao.usuario.permissoes, ["CLIENTES"]);
});

test("rejeita funcionário inativo ou não encontrado", async () => {
  const idUsuario = "10bdcf59-6fbf-433a-9c78-1112b172170e";
  let status;
  let conteudo;
  let proximoChamado = false;

  const usuarioRepository = {
    async buscarAcessoAtualPorId() {
      return null;
    },
  };

  const requisicao = { usuario: { idUsuario } };
  const resposta = {
    status(codigo) {
      status = codigo;
      return this;
    },
    json(dados) {
      conteudo = dados;
      return dados;
    },
  };

  await carregarAcessoAtual(usuarioRepository)(requisicao, resposta, () => {
    proximoChamado = true;
  });

  assert.equal(status, 401);
  assert.deepEqual(conteudo, {
    mensagem: "Funcionário inativo ou não encontrado.",
  });
  assert.equal(proximoChamado, false);
});

test("revoga imediatamente permissão removida do funcionário", async () => {
  const idUsuario = "10bdcf59-6fbf-433a-9c78-1112b172170e";
  let status;
  let proximoChamado = false;

  const usuarioRepository = {
    async buscarAcessoAtualPorId() {
      return {
        idUsuario,
        perfilAcesso: "ATENDENTE",
        permissoes: [],
      };
    },
  };

  const requisicao = {
    usuario: {
      idUsuario,
      perfilAcesso: "ATENDENTE",
      permissoes: ["CLIENTES"],
    },
  };
  const resposta = {
    status(codigo) {
      status = codigo;
      return this;
    },
    json(dados) {
      return dados;
    },
  };

  await carregarAcessoAtual(usuarioRepository)(requisicao, resposta, () =>
    autorizarModulo("CLIENTES")(requisicao, resposta, () => {
      proximoChamado = true;
    }),
  );

  assert.equal(status, 403);
  assert.equal(proximoChamado, false);
  assert.deepEqual(requisicao.usuario.permissoes, []);
});

test("concede imediatamente permissão adicionada ao funcionário", async () => {
  const idUsuario = "10bdcf59-6fbf-433a-9c78-1112b172170e";
  let status;
  let proximoChamado = false;

  const usuarioRepository = {
    async buscarAcessoAtualPorId() {
      return {
        idUsuario,
        perfilAcesso: "ATENDENTE",
        permissoes: ["CLIENTES"],
      };
    },
  };

  const requisicao = {
    usuario: {
      idUsuario,
      perfilAcesso: "ATENDENTE",
      permissoes: [],
    },
  };
  const resposta = {
    status(codigo) {
      status = codigo;
      return this;
    },
    json(dados) {
      return dados;
    },
  };

  await carregarAcessoAtual(usuarioRepository)(requisicao, resposta, () =>
    autorizarModulo("CLIENTES")(requisicao, resposta, () => {
      proximoChamado = true;
    }),
  );

  assert.equal(status, undefined);
  assert.equal(proximoChamado, true);
  assert.deepEqual(requisicao.usuario.permissoes, ["CLIENTES"]);
});
