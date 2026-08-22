import { Router } from "express";
import { FuncionarioController } from "../controllers/funcionarioController.js";
import { FuncionarioRepository } from "../repositories/funcionarioRepository.js";
import { FuncionarioService } from "../services/funcionarioService.js";
import { autenticar } from "../middlewares/autenticar.js";
import { carregarAcessoAtual } from "../middlewares/carregarAcessoAtual.js";
import { autorizarAdministracaoFuncionarios } from "../middlewares/autorizarAdministracaoFuncionarios.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";
import { validar } from "../middlewares/validar.js";
import {
  alterarPerfilFuncionarioSchema,
  consultarFuncionarioSchema,
  listarFuncionariosSchema,
  substituirPermissoesFuncionarioSchema,
} from "../validators/funcionarioValidator.js";

const rotas = Router();
const controller = new FuncionarioController(
  new FuncionarioService(new FuncionarioRepository()),
);

const usuarioRepository = new UsuarioRepository();

rotas.use(
  autenticar,
  carregarAcessoAtual(usuarioRepository),
  autorizarAdministracaoFuncionarios,
);

rotas.get("/", validar(listarFuncionariosSchema), controller.listar);
rotas.get(
  "/:id",
  validar(consultarFuncionarioSchema),
  controller.buscarPorId,
);
rotas.put(
  "/:id/permissoes",
  validar(substituirPermissoesFuncionarioSchema),
  controller.substituirPermissoes,
);
rotas.patch(
  "/:id/perfil",
  validar(alterarPerfilFuncionarioSchema),
  controller.alterarPerfil,
);

export default rotas;
