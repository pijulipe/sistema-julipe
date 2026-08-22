import { Router } from "express";
import { PermissaoController } from "../controllers/permissaoController.js";
import { PermissaoService } from "../services/permissaoService.js";
import { autenticar } from "../middlewares/autenticar.js";
import { carregarAcessoAtual } from "../middlewares/carregarAcessoAtual.js";
import { autorizarAdministracaoFuncionarios } from "../middlewares/autorizarAdministracaoFuncionarios.js";
import { validar } from "../middlewares/validar.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";
import { consultarCatalogoModulosSchema } from "../validators/permissaoValidator.js";

const rotas = Router();
const controller = new PermissaoController(new PermissaoService());
const usuarioRepository = new UsuarioRepository();

rotas.use(
  autenticar,
  carregarAcessoAtual(usuarioRepository),
  autorizarAdministracaoFuncionarios,
);

rotas.get(
  "/modulos",
  validar(consultarCatalogoModulosSchema),
  controller.listarModulos,
);

export default rotas;
