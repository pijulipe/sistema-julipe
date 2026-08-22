import test from "node:test";
import assert from "node:assert/strict";
import { FuncionarioService } from "../src/services/funcionarioService.js";

const servico = new FuncionarioService();
const funcionario = (idUsuario, perfilAcesso) => ({ idUsuario, perfilAcesso });

test("gerente pode cadastrar qualquer perfil válido", () => {
  const gerente = funcionario("gerente-1", "GERENTE");

  assert.equal(servico.podeCadastrarPerfil(gerente, "ATENDENTE"), true);
  assert.equal(servico.podeCadastrarPerfil(gerente, "ADMINISTRADOR"), true);
  assert.equal(servico.podeCadastrarPerfil(gerente, "GERENTE"), true);
});

test("administrador pode cadastrar somente atendente", () => {
  const administrador = funcionario("administrador-1", "ADMINISTRADOR");

  assert.equal(servico.podeCadastrarPerfil(administrador, "ATENDENTE"), true);
  assert.equal(servico.podeCadastrarPerfil(administrador, "ADMINISTRADOR"), false);
  assert.equal(servico.podeCadastrarPerfil(administrador, "GERENTE"), false);
});

test("rejeita cadastro por atendente, autor ausente ou perfil desconhecido", () => {
  assert.equal(
    servico.podeCadastrarPerfil(funcionario("atendente-1", "ATENDENTE"), "ATENDENTE"),
    false,
  );
  assert.equal(servico.podeCadastrarPerfil(undefined, "ATENDENTE"), false);
  assert.equal(
    servico.podeCadastrarPerfil(funcionario("gerente-1", "GERENTE"), "DONO"),
    false,
  );
});

test("gerente edita permissões de atendente e administrador", () => {
  const gerente = funcionario("gerente-1", "GERENTE");

  assert.equal(
    servico.podeEditarPermissoes(gerente, funcionario("atendente-1", "ATENDENTE")),
    true,
  );
  assert.equal(
    servico.podeEditarPermissoes(
      gerente,
      funcionario("administrador-1", "ADMINISTRADOR"),
    ),
    true,
  );
});

test("ninguém edita permissões de gerente", () => {
  const gerenteAlvo = funcionario("gerente-2", "GERENTE");

  assert.equal(
    servico.podeEditarPermissoes(funcionario("gerente-1", "GERENTE"), gerenteAlvo),
    false,
  );
  assert.equal(
    servico.podeEditarPermissoes(
      funcionario("administrador-1", "ADMINISTRADOR"),
      gerenteAlvo,
    ),
    false,
  );
});

test("administrador edita outros atendentes e administradores, mas não a si", () => {
  const administrador = funcionario("administrador-1", "ADMINISTRADOR");

  assert.equal(
    servico.podeEditarPermissoes(administrador, funcionario("atendente-1", "ATENDENTE")),
    true,
  );
  assert.equal(
    servico.podeEditarPermissoes(
      administrador,
      funcionario("administrador-2", "ADMINISTRADOR"),
    ),
    true,
  );
  assert.equal(servico.podeEditarPermissoes(administrador, administrador), false);
});

test("rejeita edição de permissões com autor, alvo ou perfil inválido", () => {
  const atendente = funcionario("atendente-1", "ATENDENTE");

  assert.equal(servico.podeEditarPermissoes(undefined, atendente), false);
  assert.equal(
    servico.podeEditarPermissoes(funcionario("gerente-1", "GERENTE"), undefined),
    false,
  );
  assert.equal(
    servico.podeEditarPermissoes(funcionario("usuario-1", "DONO"), atendente),
    false,
  );
  assert.equal(
    servico.podeEditarPermissoes(
      funcionario("gerente-1", "GERENTE"),
      funcionario("usuario-1", "DONO"),
    ),
    false,
  );
});

test("somente gerente altera perfil de atendente ou administrador", () => {
  const gerente = funcionario("gerente-1", "GERENTE");
  const atendente = funcionario("atendente-1", "ATENDENTE");
  const administrador = funcionario("administrador-1", "ADMINISTRADOR");

  assert.equal(servico.podeAlterarPerfil(gerente, atendente, "ADMINISTRADOR"), true);
  assert.equal(servico.podeAlterarPerfil(gerente, administrador, "ATENDENTE"), true);
  assert.equal(servico.podeAlterarPerfil(gerente, atendente, "GERENTE"), true);
  assert.equal(
    servico.podeAlterarPerfil(administrador, atendente, "ADMINISTRADOR"),
    false,
  );
  assert.equal(
    servico.podeAlterarPerfil(atendente, administrador, "ATENDENTE"),
    false,
  );
});

test("não altera gerente nem aceita perfil desejado desconhecido", () => {
  const gerente = funcionario("gerente-1", "GERENTE");

  assert.equal(
    servico.podeAlterarPerfil(gerente, funcionario("gerente-2", "GERENTE"), "ATENDENTE"),
    false,
  );
  assert.equal(
    servico.podeAlterarPerfil(gerente, funcionario("atendente-1", "ATENDENTE"), "DONO"),
    false,
  );
});

test("lista funcionários com metadados de paginação", async () => {
  const filtros = { pagina: 2, limite: 10 };
  const funcionarios = [
    { idUsuario: "atendente-1", perfilAcesso: "ATENDENTE" },
  ];
  const service = new FuncionarioService({
    listar: async (filtrosRecebidos) => {
      assert.equal(filtrosRecebidos, filtros);
      return { funcionarios, total: 21 };
    },
  });

  assert.deepEqual(await service.listar(filtros), {
    dados: funcionarios,
    paginacao: { pagina: 2, limite: 10, total: 21, totalPaginas: 3 },
  });
});

test("retorna 404 ao consultar funcionário inexistente", async () => {
  const service = new FuncionarioService({ buscarPorId: async () => null });

  await assert.rejects(
    () => service.buscarPorId("inexistente", funcionario("gerente-1", "GERENTE")),
    (erro) => erro.status === 404 && erro.message === "Funcionário não encontrado.",
  );
});

test("consulta funcionário com acesso total e ações permitidas", async () => {
  const gerente = funcionario("gerente-1", "GERENTE");
  const atendente = {
    ...funcionario("atendente-1", "ATENDENTE"),
    nome: "Ana",
    permissoes: ["CLIENTES"],
  };
  const service = new FuncionarioService({ buscarPorId: async () => atendente });

  assert.deepEqual(await service.buscarPorId(atendente.idUsuario, gerente), {
    ...atendente,
    acessoTotal: false,
    acoesPermitidas: { editarPermissoes: true, alterarPerfil: true },
  });
});

test("substitui permissões quando o autor pode editar o alvo", async () => {
  const gerente = funcionario("gerente-1", "GERENTE");
  const atendente = funcionario("atendente-1", "ATENDENTE");
  const chamadas = [];
  const service = new FuncionarioService({
    buscarPorId: async () => atendente,
    substituirPermissoes: async (idUsuario, modulos) => {
      chamadas.push({ idUsuario, modulos });
      return ["PEDIDOS", "CLIENTES"];
    },
  });

  assert.deepEqual(
    await service.substituirPermissoes(gerente, atendente.idUsuario, [
      "CLIENTES",
      "PEDIDOS",
    ]),
    { idUsuario: atendente.idUsuario, permissoes: ["PEDIDOS", "CLIENTES"] },
  );
  assert.deepEqual(chamadas, [
    { idUsuario: atendente.idUsuario, modulos: ["CLIENTES", "PEDIDOS"] },
  ]);
});

test("rejeita substituição de permissões sem autoridade", async () => {
  const administrador = funcionario("administrador-1", "ADMINISTRADOR");
  const service = new FuncionarioService({ buscarPorId: async () => administrador });

  await assert.rejects(
    () =>
      service.substituirPermissoes(
        administrador,
        administrador.idUsuario,
        ["CLIENTES"],
      ),
    (erro) => erro.status === 403,
  );
});

test("altera perfil quando o gerente pode editar o alvo", async () => {
  const gerente = funcionario("gerente-1", "GERENTE");
  const atendente = funcionario("atendente-1", "ATENDENTE");
  const service = new FuncionarioService({
    buscarPorId: async () => atendente,
    alterarPerfil: async () => true,
  });

  assert.deepEqual(
    await service.alterarPerfil(gerente, atendente.idUsuario, "ADMINISTRADOR"),
    { idUsuario: atendente.idUsuario, perfilAcesso: "ADMINISTRADOR" },
  );
});

test("rejeita alteração de perfil sem autoridade e trata desaparecimento", async () => {
  const administrador = funcionario("administrador-1", "ADMINISTRADOR");
  const atendente = funcionario("atendente-1", "ATENDENTE");
  const semAutoridade = new FuncionarioService({ buscarPorId: async () => atendente });

  await assert.rejects(
    () => semAutoridade.alterarPerfil(administrador, atendente.idUsuario, "GERENTE"),
    (erro) => erro.status === 403,
  );

  const desapareceu = new FuncionarioService({
    buscarPorId: async () => atendente,
    alterarPerfil: async () => false,
  });
  await assert.rejects(
    () => desapareceu.alterarPerfil(
      funcionario("gerente-1", "GERENTE"),
      atendente.idUsuario,
      "ADMINISTRADOR",
    ),
    (erro) => erro.status === 404,
  );
});
