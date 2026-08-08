import { app } from "./app.js";
import { ambiente } from "./config/ambiente.js";
import { prisma } from "./database/prisma.js";

const servidor = app.listen(ambiente.PORTA, () => {
  console.log(`Servidor iniciado na porta ${ambiente.PORTA}.`);
});

async function encerrar() {
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
