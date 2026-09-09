import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ambiente } from "./config/ambiente.js";
import clienteRoutes from "./routes/clienteRoutes.js";
import { tratarErros, tratarRotaNaoEncontrada } from "./middlewares/tratarErros.js";
import autenticacaoRoutes from "./routes/autenticacaoRoutes.js";
import funcionarioRoutes from "./routes/funcionarioRoutes.js";
import permissaoRoutes from "./routes/permissaoRoutes.js";
import produtoRoutes from "./routes/produtoRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import comboRoutes from "./routes/comboRoutes.js";
import pedidoRoutes from "./routes/pedidoRoutes.js";
import configuracaoPedidoRoutes from "./routes/configuracaoPedidoRoutes.js";

export const app = express();
app.set("json replacer", (_, valor) => typeof valor === "bigint" ? String(valor) : valor);

app.use(helmet());
app.use(cors({ origin: ambiente.origensPermitidas }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/saude", (requisicao, resposta) => resposta.status(200).json({ status: "ok" }));
app.use("/api/autenticacao", autenticacaoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/funcionarios", funcionarioRoutes);
app.use("/api/permissoes", permissaoRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/categorias-produtos", categoriaRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/configuracoes-pedidos", configuracaoPedidoRoutes);
app.use(tratarRotaNaoEncontrada);
app.use(tratarErros);
