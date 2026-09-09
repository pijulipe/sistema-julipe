import { app } from "./app.js";
import { ambiente } from "./config/ambiente.js";
import { prisma } from "./database/prisma.js";
import { repositorioPedidos, servicoPedidos, fotosPedidos } from "./routes/pedidoRoutes.js";

let processandoPedidos = false;
const filaPedidos = setInterval(async () => {
  if (processandoPedidos) return;
  processandoPedidos = true;
  try { for (let lote = 0; lote < 10; lote++) if (!await repositorioPedidos.processarFila(servicoPedidos)) break; }
  catch { console.error("Não foi possível atualizar pedidos pelo catálogo. A fila será retomada."); }
  finally { processandoPedidos = false; }
}, 5000);
filaPedidos.unref();
let limpandoFotos = false;
const limpezaFotos = setInterval(async () => {
  if (limpandoFotos) return;
  limpandoFotos = true;
  try { await fotosPedidos.limpar(); }
  catch { console.error("Limpeza de fotos pendente; será tentada novamente."); }
  finally { limpandoFotos = false; }
}, 3600000);
limpezaFotos.unref();

const servidor = app.listen(ambiente.PORTA, () => {
  console.log(`Servidor iniciado na porta ${ambiente.PORTA}.`);
});

async function encerrar() {
  clearInterval(filaPedidos);
  clearInterval(limpezaFotos);
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
