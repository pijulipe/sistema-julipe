import { Router } from "express";
import { ProdutoController } from "../controllers/produtoController.js";
import { ProdutoRepository } from "../repositories/produtoRepository.js";
import { CategoriaRepository } from "../repositories/categoriaRepository.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";
import { ProdutoService } from "../services/produtoService.js";
import { ArmazenamentoProdutoService } from "../services/armazenamentoProdutoService.js";
import { autenticar } from "../middlewares/autenticar.js";
import { carregarAcessoAtual } from "../middlewares/carregarAcessoAtual.js";
import { autorizarModulo } from "../middlewares/autorizarModulo.js";
import { validar } from "../middlewares/validar.js";
import {
  atualizarProdutoSchema,
  autorizarUploadSchema,
  consultarProdutoSchema,
  criarProdutoSchema,
  listarProdutosSchema,
  substituirProdutoSchema,
} from "../validators/produtoValidator.js";

const rotas = Router();
const controller = new ProdutoController(new ProdutoService(
  new ProdutoRepository(),
  new CategoriaRepository(),
  new ArmazenamentoProdutoService(),
));

rotas.use(
  autenticar,
  carregarAcessoAtual(new UsuarioRepository()),
  autorizarModulo("PRODUTO"),
);
rotas.post("/imagens/autorizacoes", validar(autorizarUploadSchema), controller.autorizarUpload);
rotas.post("/", validar(criarProdutoSchema), controller.criar);
rotas.get("/", validar(listarProdutosSchema), controller.listar);
rotas.get("/:id", validar(consultarProdutoSchema), controller.buscarPorId);
rotas.put("/:id", validar(substituirProdutoSchema), controller.atualizar);
rotas.patch("/:id", validar(atualizarProdutoSchema), controller.atualizar);
rotas.delete("/:id", validar(consultarProdutoSchema), controller.excluir);

export default rotas;
