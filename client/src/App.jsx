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
import CadastroPanel from "./CadastroPanel";

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
  // "login" | "cadastro" | "app"
  // Enquanto não há integração real com o backend de autenticação
  // (Supabase Auth — ver schema.sql), o acesso é liberado localmente ao
  // enviar o formulário de Login ou Cadastro. Quando a integração real
  // entrar, basta trocar o que acontece dentro de onEntrar/onCriarConta
  // (chamar supabase.auth.signInWithPassword / signUp) mantendo a mesma
  // troca de tela abaixo.
  const [telaAuth, setTelaAuth] = useState("login");

  if (telaAuth === "login") {
    return (
      <LoginPanel
        onEntrar={async () => setTelaAuth("app")}
        onEntrarComGoogle={async () => setTelaAuth("app")}
        onIrParaCadastro={() => setTelaAuth("cadastro")}
      />
    );
  }

  if (telaAuth === "cadastro") {
    return (
      <CadastroPanel
        onCriarConta={async () => setTelaAuth("app")}
        onEntrarComGoogle={async () => setTelaAuth("app")}
        onIrParaLogin={() => setTelaAuth("login")}
      />
    );
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
