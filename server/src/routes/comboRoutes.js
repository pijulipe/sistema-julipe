import { Router } from "express";
import { ComboController } from "../controllers/comboController.js";
import { ComboRepository } from "../repositories/comboRepository.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";
import { ComboService } from "../services/comboService.js";
import { autenticar } from "../middlewares/autenticar.js";
import { carregarAcessoAtual } from "../middlewares/carregarAcessoAtual.js";
import { autorizarModulo } from "../middlewares/autorizarModulo.js";
import { validar } from "../middlewares/validar.js";
import {
  atualizarComboSchema,
  consultarComboSchema,
  criarComboSchema,
  listarCombosSchema,
  substituirComboSchema,
} from "../validators/comboValidator.js";

const rotas = Router();
const controller = new ComboController(new ComboService(new ComboRepository()));

rotas.use(
  autenticar,
  carregarAcessoAtual(new UsuarioRepository()),
  autorizarModulo("COMBOS"),
);
rotas.post("/", validar(criarComboSchema), controller.criar);
rotas.get("/", validar(listarCombosSchema), controller.listar);
rotas.get("/:id", validar(consultarComboSchema), controller.buscarPorId);
rotas.put("/:id", validar(substituirComboSchema), controller.atualizar);
rotas.patch("/:id", validar(atualizarComboSchema), controller.atualizar);
rotas.delete("/:id", validar(consultarComboSchema), controller.excluir);

export default rotas;
