import { Router } from "express";
import { CategoriaController } from "../controllers/categoriaController.js";
import { CategoriaRepository } from "../repositories/categoriaRepository.js";
import { CategoriaService } from "../services/categoriaService.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";
import { autenticar } from "../middlewares/autenticar.js";
import { carregarAcessoAtual } from "../middlewares/carregarAcessoAtual.js";
import { autorizarModulo } from "../middlewares/autorizarModulo.js";

const rotas = Router();
const controller = new CategoriaController(new CategoriaService(new CategoriaRepository()));

rotas.use(
  autenticar,
  carregarAcessoAtual(new UsuarioRepository()),
  autorizarModulo("PRODUTO"),
);
rotas.get("/", controller.listar);

export default rotas;
