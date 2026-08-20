import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { AutenticacaoService } from "../src/services/autenticacaoService.js";
import { ambiente } from "../src/config/ambiente.js";

test("troca token válido do Supabase por token interno", async () => {
  const uuidValido = "94bdca59-6fbf-433a-9c78-1112b172170d";
  const idUsuario = "10bdcf59-6fbf-633a-9c78-1112b172170e";
  let uuidRecebido;

  const usuarioRepository = {
    async buscarPorAutenticacaoSupabase(uuid) {
      uuidRecebido = uuid;
      return {
        idUsuario: idUsuario,
        perfilAcesso: "ATENDENTE",
        permissoes: ["CLIENTES"],
      };
    },
  };
  const servico = new AutenticacaoService(usuarioRepository);

  const tokenSupabase = jwt.sign(
    {
      sub: uuidValido,
    },
    ambiente.SUPABASE_JWT_SECRET,
    { algorithm: "HS256", expiresIn: "5m", audience: "authenticated" },
  );

  const tokenInterno = await servico.entrar(tokenSupabase);

  assert.equal(uuidRecebido, uuidValido);

  const conteudoTokenInterno = jwt.verify(tokenInterno, ambiente.JWT_SECRET, {
    algorithms: ["HS256"],
  });

  assert.equal(conteudoTokenInterno.sub, idUsuario);

  assert.equal(conteudoTokenInterno.perfilAcesso, "ATENDENTE");
  assert.deepEqual(conteudoTokenInterno.permissoes, ["CLIENTES"]);
});

test("rejeita token do Supabase com audiência incorreta", async () => {
  const uuidValido = "94bdca59-6fbf-433a-9c78-1112b172190d";
  let repositoryConsultado = false;

  const usuarioRepository = {
    async buscarPorAutenticacaoSupabase() {
      repositoryConsultado = true;
    },
  };

  const servico = new AutenticacaoService(usuarioRepository);

  const tokenSupabase = jwt.sign(
    {
      sub: uuidValido,
    },
    ambiente.SUPABASE_JWT_SECRET,
    { algorithm: "HS256", expiresIn: "5m", audience: "anon" },
  );

  await assert.rejects(
    () => {
      return servico.entrar(tokenSupabase);
    },
    (erro) => {
      assert.equal(erro.status, 401);
      assert.equal(erro.message, "Token do Supabase inválido ou expirado.");
      return true;
    },
  );

  assert.equal(repositoryConsultado, false);
});

test("rejeita token do Supabase com sub inválido", async () => {
  let repositoryConsultado = false;

  const usuarioRepository = {
    async buscarPorAutenticacaoSupabase() {
      repositoryConsultado = true;
    },
  };

  const servico = new AutenticacaoService(usuarioRepository);

  const tokenSupabase = jwt.sign(
    {
      sub: "textosimples",
    },
    ambiente.SUPABASE_JWT_SECRET,
    { algorithm: "HS256", expiresIn: "5m", audience: "authenticated" },
  );

  await assert.rejects(
    () => {
      return servico.entrar(tokenSupabase);
    },
    (erro) => {
      assert.equal(erro.status, 401);
      assert.equal(erro.message, "Token do Supabase inválido ou expirado.");
      return true;
    },
  );

  assert.equal(repositoryConsultado, false);
});

test("rejeita token do Supabase com assinatura inválida", async () => {
  const uuidValido = "94bdca59-6fbf-433a-9c78-1112b172190d";
  let repositoryConsultado = false;

  const usuarioRepository = {
    async buscarPorAutenticacaoSupabase() {
      repositoryConsultado = true;
    },
  };
  const servico = new AutenticacaoService(usuarioRepository);

  const tokenSupabase = jwt.sign(
    { sub: uuidValido },
    "segredo-incorreto-com-no-minimo-32-caracteres",
    { algorithm: "HS256", expiresIn: "5m", audience: "authenticated" },
  );

  await assert.rejects(
    () => servico.entrar(tokenSupabase),
    (erro) => {
      assert.equal(erro.status, 401);
      assert.equal(erro.message, "Token do Supabase inválido ou expirado.");
      return true;
    },
  );
  assert.equal(repositoryConsultado, false);
});

test("rejeita token quando não existe funcionário vinculado", async () => {
  const uuidValido = "94bdca59-6fbf-433a-9c78-1112b172190d";
  let uuidRecebido;

  const usuarioRepository = {
    async buscarPorAutenticacaoSupabase(uuid) {
      uuidRecebido = uuid;
      return null;
    },
  };
  const servico = new AutenticacaoService(usuarioRepository);

  const tokenSupabase = jwt.sign(
    { sub: uuidValido },
    ambiente.SUPABASE_JWT_SECRET,
    { algorithm: "HS256", expiresIn: "5m", audience: "authenticated" },
  );

  await assert.rejects(
    () => servico.entrar(tokenSupabase),
    (erro) => {
      assert.equal(erro.status, 401);
      assert.equal(erro.message, "Não há funcionário vinculado a essa conta.");
      return true;
    },
  );
  assert.equal(uuidRecebido, uuidValido);
});

test("rejeita token expirado do Supabase", async () => {
  const uuidValido = "94bdca59-6fbf-433a-9c78-1112b172190d";
  let repositoryConsultado = false;

  const usuarioRepository = {
    async buscarPorAutenticacaoSupabase() {
      repositoryConsultado = true;
    },
  };
  const servico = new AutenticacaoService(usuarioRepository);

  const tokenSupabase = jwt.sign(
    { sub: uuidValido },
    ambiente.SUPABASE_JWT_SECRET,
    { algorithm: "HS256", expiresIn: -1, audience: "authenticated" },
  );

  await assert.rejects(
    () => servico.entrar(tokenSupabase),
    (erro) => {
      assert.equal(erro.status, 401);
      assert.equal(erro.message, "Token do Supabase inválido ou expirado.");
      return true;
    },
  );
  assert.equal(repositoryConsultado, false);
});
