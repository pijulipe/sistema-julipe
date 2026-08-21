import { Router } from "express";
import { ClienteController } from "../controllers/clienteController.js";
import { ClienteRepository } from "../repositories/clienteRepository.js";
import { ClienteService } from "../services/clienteService.js";
import { autenticar } from "../middlewares/autenticar.js";
import { autorizarModulo } from "../middlewares/autorizarModulo.js";
import { validar } from "../middlewares/validar.js";
import {
  atualizarClienteSchema,
  consultarClienteSchema,
  criarClienteSchema,
  listarClientesSchema,
  substituirClienteSchema,
} from "../validators/clienteValidator.js";
import { carregarAcessoAtual } from "../middlewares/carregarAcessoAtual.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";

const rotas = Router();
const controller = new ClienteController(new ClienteService(new ClienteRepository()));
const usuarioRepository = new UsuarioRepository();

rotas.use(autenticar, carregarAcessoAtual(usuarioRepository), autorizarModulo("CLIENTES"));
rotas.post("/", validar(criarClienteSchema), controller.criar);
rotas.get("/", validar(listarClientesSchema), controller.listar);
rotas.get("/:id", validar(consultarClienteSchema), controller.buscarPorId);
rotas.put("/:id", validar(substituirClienteSchema), controller.atualizar);
rotas.patch("/:id", validar(atualizarClienteSchema), controller.atualizar);
rotas.delete("/:id", validar(consultarClienteSchema), controller.excluir);

export default rotas;
