import { Router } from "express";
import { z } from "zod";
import { chavesModulos } from "../utils/modulos.js";
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
  atualizarDadosCadastraisFuncionarioSchema,
  consultarFuncionarioSchema,
  criarFuncionarioSchema,
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

rotas.post("/", validar(criarFuncionarioSchema), controller.criar);
rotas.put("/:id/excecoes", validar(z.object({ corpo: z.object({ excecoesModulos: z.record(z.enum(chavesModulos), z.boolean()) }).strict(), parametros: z.object({ id: z.string().uuid() }), consulta: z.object({}) })), controller.substituirExcecoes);
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
rotas.patch(
  "/:id",
  validar(atualizarDadosCadastraisFuncionarioSchema),
  controller.atualizarDadosCadastrais,
);

export default rotas;
