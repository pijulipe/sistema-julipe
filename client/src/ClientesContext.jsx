import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { normalizarTelefone } from "./formatadores";
import {
  listarClientes,
  criarCliente as criarClienteApi,
  atualizarCliente as atualizarClienteApi,
  excluirCliente as excluirClienteApi,
} from "./services/clienteService.js";
import { useAutenticacao } from "./AutenticacaoContext.jsx";

/* ---------------------------------------------------------
   Contexto global de clientes.
   Qualquer tela que precisar ler ou alterar clientes usa o
   hook useClientes() em vez de receber tudo via props.
--------------------------------------------------------- */

const ClientesContext = createContext(null);

export function ClientesProvider({ children }) {
  const [clientes, setClientes] = useState([]);
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [erroClientes, setErroClientes] = useState("");
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 20,
    total: 0,
    totalPaginas: 0,
  });

  const { tokenInterno, fazerLogout } = useAutenticacao();

  async function carregarClientes({
    busca = "",
    pagina = 1,
    limite = 20,
  } = {}) {
    if (!tokenInterno) {
      setClientes([]);
      setCarregandoClientes(false);
      return;
    }
    setCarregandoClientes(true);
    setErroClientes("");
    try {
      const resultado = await listarClientes(tokenInterno, {
        busca,
        pagina,
        limite,
      });
      setClientes(resultado.dados);
      setPaginacao(resultado.paginacao);
    } catch (erro) {
      setErroClientes(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
    } finally {
      setCarregandoClientes(false);
    }
  }

  const carregarClientesRef = useRef(carregarClientes);

  useEffect(() => {
    carregarClientesRef.current = carregarClientes;
  });

  useEffect(() => {
    if (tokenInterno) {
      carregarClientesRef.current({ busca: "", pagina: 1, limite: 20 });
    } else {
      setClientes([]);
      setCarregandoClientes(false);
    }
  }, [tokenInterno]);

  /** Retorna o cliente com o mesmo telefone (ignorando formatação), se existir. */
  const buscarClientePorTelefone = (telefone, excludeId) => {
    const target = normalizarTelefone(telefone);
    if (!target) return null;
    return (
      clientes.find(
        (c) =>
          normalizarTelefone(c.telefone) === target &&
          c.idCliente !== excludeId,
      ) || null
    );
  };

  /**
   * Cria um novo cliente.
   * data: { nome, telefone, endereco, numeroEndereco, bairro, pontoReferencia, observacoes }
   **/
  const adicionarCliente = async (data) => {
    try {
      setErroClientes("");
      const cliente = await criarClienteApi(data, tokenInterno);
      await carregarClientes({
        busca: "",
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });
      return cliente;
    } catch (erro) {
      setErroClientes(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
      throw erro;
    }
  };

  /**
   * Atualiza campos de um cliente existente.
   */
  const atualizarCliente = async (idCliente, data) => {
    try {
      setErroClientes("");
      const cliente = await atualizarClienteApi(idCliente, data, tokenInterno);
      await carregarClientes({
        busca: "",
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });
      return cliente;
    } catch (erro) {
      setErroClientes(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
      throw erro;
    }
  };

  const removerCliente = async (idCliente) => {
    try {
      setErroClientes("");
      await excluirClienteApi(idCliente, tokenInterno);
      await carregarClientes({
        busca: "",
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });
    } catch (erro) {
      setErroClientes(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
      throw erro;
    }
  };

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        adicionarCliente,
        atualizarCliente,
        removerCliente,
        buscarClientePorTelefone,
        carregandoClientes,
        erroClientes,
        paginacao,
        carregarClientes,
      }}
    >
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const ctx = useContext(ClientesContext);
  if (!ctx) {
    throw new Error(
      "useClientes precisa ser usado dentro de <ClientesProvider>",
    );
  }
  return ctx;
}
