import test from "node:test";
import assert from "node:assert/strict";
import {
  alterarPerfilFuncionarioSchema,
  consultarFuncionarioSchema,
  listarFuncionariosSchema,
  substituirPermissoesFuncionarioSchema,
} from "../src/validators/funcionarioValidator.js";
import { chavesModulos } from "../src/utils/modulos.js";

const idValido = "10bdcf59-6fbf-433a-9c78-1112b172170e";

function entrada({ corpo, parametros = {}, consulta = {} } = {}) {
  return { corpo, parametros, consulta };
}

test("aplica valores padrão e normaliza filtros da listagem", () => {
  const semFiltros = listarFuncionariosSchema.parse(entrada());
  const comFiltros = listarFuncionariosSchema.parse(
    entrada({
      consulta: {
        busca: "  ana  ",
        perfilAcesso: "ATENDENTE",
        ativo: "false",
        pagina: "2",
        limite: "10",
      },
    }),
  );

  assert.deepEqual(semFiltros.consulta, { pagina: 1, limite: 20 });
  assert.deepEqual(comFiltros.consulta, {
    busca: "ana",
    perfilAcesso: "ATENDENTE",
    ativo: false,
    pagina: 2,
    limite: 10,
  });
});

test("rejeita filtros inválidos da listagem", () => {
  const consultasInvalidas = [
    { perfilAcesso: "gerente" },
    { ativo: "sim" },
    { pagina: "0" },
    { pagina: "1.5" },
    { limite: "101" },
    { busca: "a".repeat(256) },
    { desconhecido: "x" },
  ];

  for (const consulta of consultasInvalidas) {
    assert.equal(
      listarFuncionariosSchema.safeParse(entrada({ consulta })).success,
      false,
    );
  }
});

test("valida o identificador na consulta detalhada", () => {
  assert.equal(
    consultarFuncionarioSchema.safeParse(
      entrada({ parametros: { id: idValido } }),
    ).success,
    true,
  );
  assert.equal(
    consultarFuncionarioSchema.safeParse(
      entrada({ parametros: { id: "123" } }),
    ).success,
    false,
  );
  assert.equal(
    consultarFuncionarioSchema.safeParse(
      entrada({ parametros: { id: idValido }, consulta: { extra: "x" } }),
    ).success,
    false,
  );
});

test("aceita conjunto vazio ou válido de permissões", () => {
  for (const modulos of [[], ["CLIENTES"], [...chavesModulos]]) {
    assert.equal(
      substituirPermissoesFuncionarioSchema.safeParse(
        entrada({ corpo: { modulos }, parametros: { id: idValido } }),
      ).success,
      true,
    );
  }
});

test("rejeita permissões repetidas, desconhecidas ou malformadas", () => {
  const corposInvalidos = [
    {},
    { modulos: "CLIENTES" },
    { modulos: ["CLIENTES", "CLIENTES"] },
    { modulos: ["clientes"] },
    { modulos: ["CONFIGURACOES"] },
    { modulos: [], extra: true },
  ];

  for (const corpo of corposInvalidos) {
    assert.equal(
      substituirPermissoesFuncionarioSchema.safeParse(
        entrada({ corpo, parametros: { id: idValido } }),
      ).success,
      false,
    );
  }
});

test("aceita somente alteração de perfil canônica e sem campos extras", () => {
  for (const perfilAcesso of ["ATENDENTE", "ADMINISTRADOR", "GERENTE"]) {
    assert.equal(
      alterarPerfilFuncionarioSchema.safeParse(
        entrada({ corpo: { perfilAcesso }, parametros: { id: idValido } }),
      ).success,
      true,
    );
  }

  for (const corpo of [
    {},
    { perfilAcesso: "gerente" },
    { perfilAcesso: "DONO" },
    { perfilAcesso: "ATENDENTE", ativo: true },
  ]) {
    assert.equal(
      alterarPerfilFuncionarioSchema.safeParse(
        entrada({ corpo, parametros: { id: idValido } }),
      ).success,
      false,
    );
  }
});
