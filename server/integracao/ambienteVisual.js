// Ambiente descartável para verificação visual. Não usa credenciais nem bancos remotos.
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const raiz = resolve(".testes-pedidos");
await mkdir(raiz, { recursive: true });
const diretorio = await mkdtemp(resolve(raiz, "visual-"));
if (!diretorio.startsWith(raiz + sep)) throw new Error("Diretório de testes inválido.");
const banco = new EmbeddedPostgres({ databaseDir: diretorio, user: "postgres", password: "teste-local-descartavel", port: 55439, persistent: false, postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
await banco.initialise();
await banco.start();
const sql = banco.getPgClient();
await sql.connect();
await sql.query(await readFile("test/fixtures/schemaAnteriorPedidos.sql", "utf8"));
await sql.query(await readFile("../documentacao_bd/sql/2026-09-07_pedidos.sql", "utf8"));
await sql.query(await readFile("../documentacao_bd/sql/2026-09-07_pedidos_restricoes.sql", "utf8"));
Object.assign(process.env, {
  DATABASE_URL: "postgresql://postgres:teste-local-descartavel@127.0.0.1:55439/postgres",
  JWT_SECRET: "segredo-local-exclusivo-dos-testes-de-pedidos-2026",
  SUPABASE_JWT_SECRET: "segredo-local-exclusivo-dos-testes-supabase-2026",
  SUPABASE_URL: "http://127.0.0.1:55440", SUPABASE_SERVICE_ROLE_KEY: "chave-local-de-testes-sem-nenhum-acesso-remoto-2026",
  PORTA: "3334", ORIGENS_PERMITIDAS: "http://127.0.0.1:5174", NODE_ENV: "test",
});
const { prisma } = await import("../src/database/prisma.js");
const identidades = [];
for (const [nome, perfilAcesso] of [["Gerente", "GERENTE"], ["Atendente", "ATENDENTE"], ["Produção", "ATENDENTE"]]) {
  const email = nome === "Produção" ? "producao@teste.invalid" : `${nome.toLowerCase()}@teste.invalid`;
  const usuario = await prisma.usuario.create({ data: { nome: `${nome} de teste`, email, perfilAcesso, idAutenticacaoSupabase: randomUUID(), permissoesFuncionario: { create: (nome === "Produção" ? ["PRODUCAO"] : ["PEDIDOS", "CLIENTES"]).map((modulo) => ({ modulo })) } } });
  identidades.push(usuario);
}
const categorias = await Promise.all(["Bolos", "Doces", "Salgados", "Bebidas", "Congelados", "Festas"].map((nome_categoria) => prisma.categorias.create({ data: { nome_categoria } })));
await prisma.produtos.create({ data: { nome: "Coxinha", id_categoria: categorias[2].id_categoria, preco_unitario: "20", multiplo_minimo: 25 } });
await prisma.produtos.create({ data: { nome: "Bolo de chocolate", id_categoria: categorias[0].id_categoria, preco_unitario: "90", multiplo_minimo: 1 } });
await prisma.cliente.create({ data: { nome: "Maria de teste", telefone: "11999999999", endereco: "Rua das Flores", numeroEndereco: "10", bairro: "Centro" } });
await prisma.expedientePedido.createMany({ data: Array.from({ length: 7 }, (_, diaSemana) => ({ diaSemana, aberto: true, inicio: "08:00", fim: "18:00" })) });
const autenticacao = express();
autenticacao.use(cors({ origin: "http://127.0.0.1:5174" }));
autenticacao.use(express.json());
autenticacao.post("/auth/v1/token", (req, res) => {
  const identidade = identidades.find((u) => u.email === req.body.email);
  if (!identidade || req.body.password !== "Teste-local-2026!") return res.status(400).json({ msg: "Credenciais locais inválidas." });
  const usuario = { id: identidade.idAutenticacaoSupabase, email: identidade.email, aud: "authenticated", role: "authenticated", created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
  const token = jwt.sign({ sub: usuario.id, role: "authenticated" }, process.env.SUPABASE_JWT_SECRET, { algorithm: "HS256", audience: "authenticated", issuer: "http://127.0.0.1:55440/auth/v1", expiresIn: "8h" });
  res.json({ access_token: token, token_type: "bearer", expires_in: 28800, expires_at: Math.floor(Date.now() / 1000) + 28800, refresh_token: randomUUID(), user: usuario });
});
autenticacao.post("/auth/v1/logout", (req, res) => res.status(204).end());
const servidorAuth = autenticacao.listen(55440, "127.0.0.1");
const { app } = await import("../src/app.js");
const servidor = app.listen(3334, "127.0.0.1", () => console.log("API visual local pronta na porta 3334. Autenticação de teste local pronta na porta 55440."));
async function encerrar() {
  servidor.close(); servidorAuth.close();
  await prisma.$disconnect(); await sql.end(); await banco.stop(); process.exit(0);
}
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
