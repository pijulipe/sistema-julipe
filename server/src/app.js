import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ambiente } from "./config/ambiente.js";
import clienteRoutes from "./routes/clienteRoutes.js";
import { tratarErros, tratarRotaNaoEncontrada } from "./middlewares/tratarErros.js";
import autenticacaoRoutes from "./routes/autenticacaoRoutes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: ambiente.origensPermitidas }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/saude", (requisicao, resposta) => resposta.status(200).json({ status: "ok" }));
app.use("/api/autenticacao", autenticacaoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use(tratarRotaNaoEncontrada);
app.use(tratarErros);
