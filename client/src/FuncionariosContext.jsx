import React, { createContext, useContext, useState } from "react";
import { useEffect, useRef } from "react";
import {
  listarFuncionarios,
  buscarFuncionarioPorId,
  substituirPermissoes,
  alterarPerfil,
  criarFuncionario as criarFuncionarioApi,
} from "./services/funcionarioService.js";
import { useAutenticacao } from "./AutenticacaoContext.jsx";

/* ---------------------------------------------------------
   Contexto global de funcionários (usuários do sistema).
   Qualquer tela que precisar ler ou alterar funcionários usa o
   hook useFuncionarios() em vez de receber tudo via props.

   Os dados vêm da API (server/src/routes/funcionarioRoutes.js),
   não são mais mantidos só em memória.

   Funcionário (na listagem): { idUsuario, nome, email, perfilAcesso, ativo }
   Funcionário (na consulta por id): inclui também { permissoes, acessoTotal, acoesPermitidas }

   - perfilAcesso: "ADMINISTRADOR" | "GERENTE" | "ATENDENTE" (mesmos valores da API)
   - acessoTotal: já vem calculado pelo backend (true quando perfilAcesso é GERENTE) —
     o frontend não deve recalcular essa regra.
   - acoesPermitidas: { editarPermissoes, alterarPerfil } — indica o que o usuário
     autenticado pode fazer com aquele funcionário específico.
--------------------------------------------------------- */


const FuncionariosContext = createContext(null);



// Chaves alinhadas com o `view` de App.jsx, para que a lista de telas
// aqui corresponda exatamente às telas navegáveis do sistema.
export const TELAS_ACESSO = [
  { key: "home", label: "Início" },
  { key: "novoPedido", label: "Novo Pedido" },
  { key: "producao", label: "Produção" },
  { key: "produto", label: "Produto" },
  { key: "combos", label: "Combos" },
  { key: "relatorio", label: "Relatório" },
  { key: "clientes", label: "Clientes" },
  { key: "estoque", label: "Estoque" },
  { key: "expedicao", label: "Expedição" },
  { key: "funcionarios", label: "Funcionários" },
];

export const PERFIS_ACESSO = [
  { key: "ADMINISTRADOR", label: "Administrador" },
  { key: "GERENTE", label: "Gerente" },
  { key: "ATENDENTE", label: "Atendente" },
];



export function FuncionariosProvider({ children }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregandoFuncionarios, setCarregandoFuncionarios] = useState(true);
  const [erroFuncionarios, setErroFuncionarios] = useState("");
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 20,
    total: 0,
    totalPaginas: 0,
  });

  const { tokenInterno, fazerLogout } = useAutenticacao();

  async function carregarFuncionarios({
    busca = "",
    perfilAcesso,
    ativo,
    pagina = 1,
    limite = 20,
  } = {}) {
    if (!tokenInterno) {
      setFuncionarios([]);
      setCarregandoFuncionarios(false);
      return;
    }
    setCarregandoFuncionarios(true);
    setErroFuncionarios("");
    try {
      const resultado = await listarFuncionarios(tokenInterno, {
        busca,
        perfilAcesso,
        ativo,
        pagina,
        limite,
      });
      setFuncionarios(resultado.dados);
      setPaginacao(resultado.paginacao);
    } catch (erro) {
      setErroFuncionarios(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
    } finally {
      setCarregandoFuncionarios(false);
    }

  }

  const carregarFuncionariosRef = useRef(carregarFuncionarios);

  useEffect(() => {
    carregarFuncionariosRef.current = carregarFuncionarios;
  });

  useEffect(() => {
    if (tokenInterno) {
      carregarFuncionariosRef.current({ busca: "", pagina: 1, limite: 20 });
    } else {
      setFuncionarios([]);
      setCarregandoFuncionarios(false);
    }
  }, [tokenInterno]);


  async function buscarFuncionario(idUsuario) {
    const resultado = await buscarFuncionarioPorId(idUsuario, tokenInterno)

    return resultado
  }

  const atualizarPermissoes = async (idUsuario, modulos) => {
    try {
      setErroFuncionarios("");
      const resultado = await substituirPermissoes(idUsuario, modulos, tokenInterno);
      await carregarFuncionarios({
        busca: "",
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });
      return resultado;
    } catch (erro) {
      setErroFuncionarios(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
      throw erro;
    }
  };

  const criarFuncionario = async (dados) => {
    try {
      setErroFuncionarios("");
      const resultado = await criarFuncionarioApi(dados, tokenInterno);
      await carregarFuncionarios({
        busca: "",
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });
      return resultado;
    } catch (erro) {
      setErroFuncionarios(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
      throw erro;
    }
  };

  const atualizarPerfil = async (idUsuario, perfilAcesso) => {
    try {
      setErroFuncionarios("");
      const resultado = await alterarPerfil(idUsuario, perfilAcesso, tokenInterno);
      await carregarFuncionarios({
        busca: "",
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });
      return resultado;
    } catch (erro) {
      setErroFuncionarios(erro.message);
      if (erro.status === 401) {
        await fazerLogout();
      }
      throw erro;
    }
  };




  return (
    <FuncionariosContext.Provider
      value={{
        funcionarios,
        carregandoFuncionarios,
        erroFuncionarios,
        paginacao,
        carregarFuncionarios,
        buscarFuncionario,
        criarFuncionario,
        atualizarPermissoes,
        atualizarPerfil,
      }}
    >
      {children}
    </FuncionariosContext.Provider>
  );
}

export function useFuncionarios() {
  const ctx = useContext(FuncionariosContext);
  if (!ctx) {
    throw new Error(
      "useFuncionarios precisa ser usado dentro de <FuncionariosProvider>"
    );
  }
  return ctx;
}
