import React, { useState } from "react";
import { PedidosProvider } from "./PedidosContext";
import { ProdutosProvider } from "./ProdutosContext";
import { CombosProvider } from "./CombosContext";
import { ClientesProvider } from "./ClientesContext";
import { EstoqueProvider } from "./EstoqueContext";
import { ConfiguracoesProvider } from "./ConfiguracoesContext";
import { FuncionariosProvider } from "./FuncionariosContext";
import Navbar from "./Navbar";
import DoceriaJulipeDashboard from "./DoceriaJulipeDashboard";
import PedidosPanel from "./PedidosPanel";
import ProducaoPanel from "./ProducaoPanel";
import ProdutosPanel from "./ProdutosPanel";
import CombosPanel from "./CombosPanel";
import ClientesPanel from "./ClientesPanel";
import EstoquePanel from "./EstoquePanel";
import ExpedicaoPanel from "./ExpedicaoPanel";
import RelatoriosPanel from "./RelatoriosPanel";
import FuncionariosPanel from "./FuncionariosPanel";
import NovoPedidoModal from "./NovoPedidoModal";
import LoginPanel from "./LoginPanel";
import { entrar } from "./services/autenticacaoService.js";

function AppContent() {
  // "home" | "pedidos" | "producao" | "produto" | "combos" | "clientes" | "estoque" | "expedicao" | "relatorio" | "funcionarios" | "novoPedido"
  const [view, setView] = useState("home");
  // Guarda de qual tela o "Novo Pedido" foi aberto, para voltar pra lá ao
  // fechar o modal — funciona tanto a partir do Início quanto de Pedidos.
  const [telaAnterior, setTelaAnterior] = useState("home");

  const abrirNovoPedido = () => {
    setTelaAnterior(view);
    setView("novoPedido");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar
        ativo={view === "novoPedido" ? telaAnterior : view}
        onNavigate={setView}
      />

      {view === "home" && (
        <DoceriaJulipeDashboard onNovoPedido={abrirNovoPedido} />
      )}

      {view === "pedidos" && <PedidosPanel onNovoPedido={abrirNovoPedido} />}

      {view === "producao" && <ProducaoPanel />}

      {view === "produto" && <ProdutosPanel />}

      {view === "combos" && <CombosPanel />}

      {view === "clientes" && <ClientesPanel />}

      {view === "estoque" && <EstoquePanel />}

      {view === "expedicao" && <ExpedicaoPanel />}

      {view === "relatorio" && <RelatoriosPanel />}

      {view === "funcionarios" && <FuncionariosPanel />}

      {view === "novoPedido" && (
        <NovoPedidoModal onClose={() => setView(telaAnterior)} />
      )}
    </div>
  );
}

export default function App() {
  // A restauração automática da sessão será adicionada na próxima etapa.
  const [telaAuth, setTelaAuth] = useState("login");

  async function fazerLogin({ email, senha }) {
    await entrar({ email, senha });
    setTelaAuth("app");
  }

  if (telaAuth === "login") {
    return <LoginPanel onEntrar={fazerLogin} />;
  }

  return (
    <ConfiguracoesProvider>
      <PedidosProvider>
        <ProdutosProvider>
          <CombosProvider>
            <ClientesProvider>
              <EstoqueProvider>
                <FuncionariosProvider>
                  <AppContent />
                </FuncionariosProvider>
              </EstoqueProvider>
            </ClientesProvider>
          </CombosProvider>
        </ProdutosProvider>
      </PedidosProvider>
    </ConfiguracoesProvider>
  );
}
