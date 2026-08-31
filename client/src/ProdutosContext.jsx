import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { listarCategoriasProdutos } from "./services/categoriaService.js";
import {
  atualizarProduto as atualizarProdutoApi,
  criarProduto,
  enviarImagemProduto,
  excluirProduto,
  listarProdutos,
} from "./services/produtoService.js";

const ProdutosContext = createContext(null);

function adaptarProduto(produto) {
  return {
    ...produto,
    id: Number(produto.idProduto),
    categoria: produto.categoria.nome,
    preco: produto.precoUnitario,
    unidade: produto.unidadeMedida,
    unidadesPorPacote: produto.multiploMinimo,
    status: produto.ativo ? "Ativo" : "Inativo",
    imagem: produto.imagemUrl,
  };
}

export function ProdutosProvider({ children }) {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [erroProdutos, setErroProdutos] = useState("");
  const [paginacao, setPaginacao] = useState({ pagina: 1, limite: 20, total: 0, totalPaginas: 0 });
  const { tokenInterno, fazerLogout } = useAutenticacao();

  async function tratarErro(erro) {
    setErroProdutos(erro?.message || "Não foi possível concluir a operação.");
    if (erro?.status === 401) await fazerLogout();
    throw erro;
  }
  const tratarErroRef = useRef(tratarErro);
  useEffect(() => { tratarErroRef.current = tratarErro; });

  async function carregarProdutos(filtros = {}) {
    if (!tokenInterno) return;
    setCarregandoProdutos(true);
    setErroProdutos("");
    try {
      const resultado = await listarProdutos(tokenInterno, { pagina: 1, limite: paginacao.limite, ...filtros });
      setProdutos(resultado.dados.map(adaptarProduto));
      setPaginacao(resultado.paginacao);
    } catch (erro) {
      await tratarErro(erro).catch(() => {});
    } finally {
      setCarregandoProdutos(false);
    }
  }

  const carregarRef = useRef(carregarProdutos);
  useEffect(() => { carregarRef.current = carregarProdutos; });
  useEffect(() => {
    if (!tokenInterno) {
      setProdutos([]);
      setCategorias([]);
      setCarregandoProdutos(false);
      return;
    }
    Promise.all([carregarRef.current(), listarCategoriasProdutos(tokenInterno)])
      .then(([, dadosCategorias]) => setCategorias(dadosCategorias))
      .catch(async (erro) => { await tratarErroRef.current(erro).catch(() => {}); });
  }, [tokenInterno]);

  async function salvarProduto(dados, idProduto) {
    setErroProdutos("");
    try {
      let caminhoImagem = dados.caminhoImagem;
      if (dados.arquivoImagem) caminhoImagem = await enviarImagemProduto(dados.arquivoImagem, tokenInterno);
      const corpo = { ...dados, caminhoImagem };
      delete corpo.arquivoImagem;
      const salvo = idProduto
        ? await atualizarProdutoApi(idProduto, corpo, tokenInterno)
        : await criarProduto(corpo, tokenInterno);
      return adaptarProduto(salvo);
    } catch (erro) {
      return tratarErro(erro);
    }
  }

  async function removerProduto(idProduto) {
    try { await excluirProduto(idProduto, tokenInterno); }
    catch (erro) { return tratarErro(erro); }
  }

  const buscarProdutoPorNome = (nome, excluirId) => produtos.find(
    (produto) => produto.nome.trim().toLowerCase() === nome.trim().toLowerCase()
      && produto.idProduto !== excluirId,
  ) || null;

  return <ProdutosContext.Provider value={{
    produtos, categorias, carregandoProdutos, erroProdutos, paginacao,
    carregarProdutos, salvarProduto, removerProduto, buscarProdutoPorNome,
  }}>{children}</ProdutosContext.Provider>;
}

export function useProdutos() {
  const contexto = useContext(ProdutosContext);
  if (!contexto) throw new Error("useProdutos precisa ser usado dentro de ProdutosProvider.");
  return contexto;
}
