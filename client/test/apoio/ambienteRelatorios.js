import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { calcularFinanceiro } from "../../../server/src/services/calculoPedido.js";


export function criarPedido({ id = "1", data = "2026-09-21", status = "RECEBIDO", itens, total, pagamentos = [], cliente = "1", horario = "06:15" } = {}) {
  itens ||= [{ tipo: "PRODUTO", idCadastro: "9007199254740993", nome: "Coxinha histórica", quantidade: 50, multiploMinimo: 25, precoPacoteCentavos: "2000", subtotalCentavos: "4000", composicao: [{ categoria: "Salgados", quantidade: 1 }] }];
  const subtotal = itens.reduce((soma, item) => soma + BigInt(item.subtotalCentavos), 0n);
  total ||= String(subtotal);
  const pedido = { idPedido: id, status, fotografia: { itens, idCliente: cliente, cliente: { nome: "Maria de teste", telefone: "11999999999", bairro: "Centro" }, endereco: { bairro: "Centro" }, dataEntrega: data, horarioEntrega: horario, tipoEntrega: "RETIRADA", subtotalCentavos: String(subtotal), totalCentavos: total, descontoCentavos: String(subtotal - BigInt(total)), desconto: { percentual: "0" } }, pagamentos, financeiro: calcularFinanceiro(total, pagamentos) };
  const foto = pedido.fotografia;
  return { ...pedido, id, status: status.toLowerCase(), itens: foto.itens.map((item) => ({...item, id: item.tipo === "COMBO" ? `combo-${item.idCadastro}` : Number(item.idCadastro)})), cliente: {...foto.cliente, id: cliente}, dataEntrega: data, horarioEntrega: horario, tipoEntrega: "retirada", subtotal: Number(subtotal)/100, total: Number(total)/100, valorDesconto: Number(subtotal-BigInt(total))/100, statusPagamento: pedido.financeiro.situacao.toLowerCase() };
}

export function cenarioRelatorios() {
  return [criarPedido(), criarPedido({ id: "2", itens: [{ tipo: "COMBO", idCadastro: "9007199254740993", nome: "Combo Festa histórico", quantidade: 2, multiploMinimo: 1, precoPacoteCentavos: "9000", subtotalCentavos: "18000", composicao: [{ nome: "Bolo", quantidade: 1, categoria: "Bolos" }] }], pagamentos: [{ forma: "PIX", situacao: "CONFIRMADO", valorCentavos: "20000", estornos: [{ valorCentavos: "3000" }], criadoEm: "2026-08-01" }] }), criarPedido({ id: "3", status: "CANCELADO", pagamentos: [{ forma: "DEBITO", situacao: "CONFIRMADO", valorCentavos: "4000", estornos: [] }], horario: "23:45" })];
}

// Ambiente exclusivamente local: substitui os Providers, sem autenticação ou banco real.
export async function criarAmbiente(opcoes = {}) {
  const raiz = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const contexto = `import { useState } from 'react';
    const pedidos = ${JSON.stringify(opcoes.pedidos || cenarioRelatorios())};
    export function usePedidos() { const [erro, setErro] = useState(${JSON.stringify(opcoes.erro || "")}); return { pedidos, erro, carregando: ${!!opcoes.carregando}, recarregar: () => setErro(''), requisitar: async () => ({dados: {faturamentoCentavos:'22000', recebidoCentavos:'24000', estornadoCentavos:'3000', excedenteCentavos:'0', legados:0}}) }; }
    export const useClientes = () => ({}); export const useCombos = () => ({combos:[]}); export const useProdutos = () => ({produtos:[]});`;
  const servidor = await createServer({ root: decodeURIComponent(raiz), server: { host: "127.0.0.1", port: 5175 }, plugins: [{ name: "relatorios-locais", enforce: "pre",
    async load(id) {
      if (/\/(Pedidos|Clientes|Combos|Produtos)Context\.jsx$/.test(id)) return contexto;
      if (id.endsWith("/FormularioPedido.jsx")) return 'export const formatarCentavos = (v) => (Number(v)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});';
      if (id.endsWith("/RelatoriosPanel.jsx")) {
        let texto = opcoes.antes ? execFileSync("git", ["show", "HEAD:client/src/RelatoriosPanel.jsx"], { encoding: "utf8" }) : await readFile(id, "utf8");
        texto = texto.replace('useState("visao-geral")', `useState(${JSON.stringify(opcoes.aba || "visao-geral")})`).replace('useState("hoje")', `useState(${JSON.stringify(opcoes.preset || 'tudo')})`);
        if (opcoes.intervalo) texto = texto.replace('useState({ start: "", end: "" });\n  const [tentandoNovamente', `useState(${JSON.stringify(opcoes.intervalo)});\n  const [tentandoNovamente`);
        return texto + '\nexport { exportarPedidosCSV, computeRange, eachDayISO };';
      }
      if (opcoes.antes && id.endsWith("/ResumoFinanceiroPedidos.jsx")) return execFileSync("git", ["show", "HEAD:client/src/ResumoFinanceiroPedidos.jsx"], { encoding: "utf8" });
    },
    configureServer(instancia) {
      instancia.middlewares.use('/verificacao', async (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(await instancia.transformIndexHtml('/verificacao', '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#f8fafc"><div id="root"></div><script type="module">import React from "react"; import {createRoot} from "react-dom/client"; import Painel from "/src/RelatoriosPanel.jsx"; import "/src/index.css"; createRoot(document.getElementById("root")).render(React.createElement(Painel));</script></body></html>'));
      });
    }
  }] });
  return servidor;
}
