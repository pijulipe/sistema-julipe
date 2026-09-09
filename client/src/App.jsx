import React, { useState } from "react";
import { PedidosProvider, usePedidos } from "./PedidosContext";
import { ProdutosProvider } from "./ProdutosContext";
import { CombosProvider } from "./CombosContext";
import { ClientesProvider } from "./ClientesContext";
import { EstoqueProvider } from "./EstoqueContext";
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
import CarregamentoAutenticacao from "./CarregamentoAutenticacao";
import { useAutenticacao } from "./AutenticacaoContext.jsx";

function AppContent() {
  // "home" | "pedidos" | "producao" | "produto" | "combos" | "clientes" | "estoque" | "expedicao" | "relatorio" | "funcionarios" | "novoPedido"
  const [telaSelecionada, setView] = useState("home");
  const { acesso, erro: erroPedidos, carregando: carregandoPedidos } = usePedidos();
  const podeAbrir = (tela) => tela === "home" || acesso?.perfilAcesso === "GERENTE" || (tela === "funcionarios" ? acesso?.perfilAcesso === "ADMINISTRADOR" : acesso?.permissoes.includes(tela === "novoPedido" ? "PEDIDOS" : tela.toUpperCase()));
  const view = podeAbrir(telaSelecionada) ? telaSelecionada : "home";
  // Guarda de qual tela o "Novo Pedido" foi aberto, para voltar pra lá ao
  // fechar o modal — funciona tanto a partir do Início quanto de Pedidos.
  const [telaAnterior, setTelaAnterior] = useState("home");
  const [saindo, setSaindo] = useState(false);
  const [erroLogout, setErroLogout] = useState("");

  const abrirNovoPedido = () => {
    setTelaAnterior(view);
    setView("novoPedido");
  };

  const { fazerLogout } = useAutenticacao();

  async function lidarComLogout() {
    setErroLogout("");
    setSaindo(true);
    try {
      await fazerLogout();
    } catch (erro) {
      setErroLogout(erro?.message || "Não foi possível sair do sistema.");
    } finally {
      setSaindo(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar
        ativo={view === "novoPedido" ? telaAnterior : view}
        onNavigate={setView}
        onSair={lidarComLogout}
        saindo={saindo}
        podeAbrir={podeAbrir}
      />
      {carregandoPedidos && <p role="status" className="p-4">Carregando pedidos e acesso…</p>}
      {erroPedidos && view !== "home" && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-red-700">{erroPedidos}</p>}

      {erroLogout && (
        <div className="mx-auto mt-4 max-w-7xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {erroLogout}
        </div>
      )}

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
  const { autenticado, carregandoAutenticacao, fazerLogin } = useAutenticacao();

  if (carregandoAutenticacao) {
    return <CarregamentoAutenticacao />;
  }

  if (!autenticado) {
    return <LoginPanel onEntrar={fazerLogin} />;
  }

  return (
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
  );
}
