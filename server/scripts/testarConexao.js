import { prisma } from "../src/database/prisma.js";

function exibirDiagnosticoSeguro() {
  try {
    const url = new URL(process.env.DATABASE_URL);
    const usaPooler = url.hostname.endsWith(".pooler.supabase.com");
    const usuario = decodeURIComponent(url.username);
    const senha = decodeURIComponent(url.password);

    console.log("Diagnóstico seguro da URL:");
    console.log(`- Protocolo PostgreSQL: ${["postgres:", "postgresql:"].includes(url.protocol) ? "sim" : "não"}`);
    console.log(`- Host do Supabase Pooler: ${usaPooler ? "sim" : "não"}`);
    console.log(`- Porta de Session pooler (5432): ${url.port === "5432" ? "sim" : "não"}`);
    console.log(`- Usuário do pooler possui referência do projeto: ${!usaPooler || usuario.startsWith("postgres.") ? "sim" : "não"}`);
    console.log(`- Senha foi preenchida: ${senha && !senha.includes("YOUR-PASSWORD") ? "sim" : "não"}`);
    console.log(`- Banco selecionado é postgres: ${url.pathname === "/postgres" ? "sim" : "não"}`);
  } catch {
    console.log("Diagnóstico seguro: DATABASE_URL não é uma URL válida.");
  }
}

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("Conexão com o PostgreSQL do Supabase realizada com sucesso.");
} catch (erro) {
  console.error("Não foi possível conectar ao PostgreSQL do Supabase.");
  console.error(erro instanceof Error ? erro.message : erro);
  exibirDiagnosticoSeguro();
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
