import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { dataOperacao } from "../src/utils/producao.js";

async function renderizar({ gerente = false, concluido = false, erro = "", carregando = false, vazio = false } = {}) {
  const pedidos = vazio ? [] : [{ id: "1", revisao: 1, status: concluido ? "entregue" : "em_rota", tipoEntrega: "entrega", dataEntrega: dataOperacao(), horarioEntrega: "12:00", cliente: { nome: "Cliente fictício" }, itens: [], total: 40 }];
  const servidor = await createServer({ server: { middlewareMode: true }, plugins: [{ name: "expedicao-teste", enforce: "pre", async load(id) {
    if (id.endsWith("/PedidosContext.jsx")) return `export const usePedidos = () => (${JSON.stringify({ pedidos, acesso: { perfilAcesso: gerente ? "GERENTE" : "ATENDENTE", permissoes: ["EXPEDICAO"] }, erro, carregando })});`;
    if (id.endsWith("/FormularioPedido.jsx")) return "export default function FormularioPedido() { return null; }";
    if (concluido && id.endsWith("/ExpedicaoPanel.jsx")) return (await readFile(id, "utf8")).replace('useState("ativos")', 'useState("concluidos")');
  } }] });
  try { const { default: Painel } = await servidor.ssrLoadModule("/src/ExpedicaoPanel.jsx"); return renderToStaticMarkup(React.createElement(Painel)); }
  finally { await servidor.close(); }
}

test("Expedição renderiza consulta para operador e retornos somente para gerente", async () => {
  for (const concluido of [false, true]) {
    const operador = await renderizar({ concluido });
    const gerente = await renderizar({ concluido, gerente: true });
    assert.ok(operador.includes("Cliente fictício"));
    const acao = concluido ? "Revisar e reabrir em produção" : "Voltar para Pronto";
    assert.ok(!operador.includes(acao));
    assert.ok(gerente.includes(acao));
    if (concluido) {
      assert.ok(operador.includes("Nenhuma entrega no roteiro"));
      assert.ok(!operador.includes("Saiu para Entrega"));
    }
  }
});

test("Expedição diferencia falha, carregamento e vazio sem números confiáveis durante falha", async () => {
  for (const opcoes of [{ erro: "Falha fictícia", vazio: true }, { carregando: true, vazio: true }, { vazio: true }]) {
    const html = await renderizar(opcoes);
    if (opcoes.erro) assert.ok(html.includes('role="alert"') && html.includes("Consultar estado atualizado"));
    if (opcoes.carregando) assert.ok(html.includes("Carregando pedidos"));
    assert.equal(html.includes("Nenhum pedido pronto para expedição hoje"), !opcoes.erro && !opcoes.carregando);
    assert.equal(html.includes("—"), Boolean(opcoes.erro || opcoes.carregando));
  }
});
