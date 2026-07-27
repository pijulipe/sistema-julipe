import React, { useState } from "react";
import { OrdersProvider } from "./OrdersContext";
import { ProductsProvider } from "./ProductsContext";
import { CombosProvider } from "./CombosContext";
import { ClientsProvider } from "./ClientsContext";
import { StockProvider } from "./StockContext";
import { SettingsProvider } from "./SettingsContext";
import Navbar from "./Navbar";
import DoceriaJulipeDashboard from "./DoceriaJulipeDashboard";
import PedidosPanel from "./PedidosPanel";
import ProductionPanel from "./ProductionPanel";
import ProductsPanel from "./ProductsPanel";
import CombosPanel from "./CombosPanel";
import ClientsPanel from "./ClientsPanel";
import StockPanel from "./StockPanel";
import ExpedicaoPanel from "./ExpedicaoPanel";
import ReportsPanel from "./ReportsPanel";
import NovoPedidoModal from "./NovoPedidoModal";

function AppContent() {
  // "home" | "pedidos" | "producao" | "produto" | "combos" | "clientes" | "estoque" | "expedicao" | "relatorio" | "novoPedido"
  const [view, setView] = useState("home");
  // Guarda de qual tela o "Novo Pedido" foi aberto, para voltar pra lá ao
  // fechar o modal — funciona tanto a partir do Início quanto de Pedidos.
  const [previousView, setPreviousView] = useState("home");

  const openNovoPedido = () => {
    setPreviousView(view);
    setView("novoPedido");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar
        active={view === "novoPedido" ? previousView : view}
        onNavigate={setView}
      />

      {view === "home" && (
        <DoceriaJulipeDashboard onNovoPedido={openNovoPedido} />
      )}

      {view === "pedidos" && <PedidosPanel onNovoPedido={openNovoPedido} />}

      {view === "producao" && <ProductionPanel />}

      {view === "produto" && <ProductsPanel />}

      {view === "combos" && <CombosPanel />}

      {view === "clientes" && <ClientsPanel />}

      {view === "estoque" && <StockPanel />}

      {view === "expedicao" && <ExpedicaoPanel />}

      {view === "relatorio" && <ReportsPanel />}

      {view === "novoPedido" && (
        <NovoPedidoModal onClose={() => setView(previousView)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <OrdersProvider>
        <ProductsProvider>
          <CombosProvider>
            <ClientsProvider>
              <StockProvider>
                <AppContent />
              </StockProvider>
            </ClientsProvider>
          </CombosProvider>
        </ProductsProvider>
      </OrdersProvider>
    </SettingsProvider>
  );
}
