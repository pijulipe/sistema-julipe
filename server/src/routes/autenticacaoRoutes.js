import { Router } from "express";
import { AutenticacaoController } from "../controllers/autenticacaoController.js";
import { AutenticacaoService } from "../services/autenticacaoService.js";
import { UsuarioRepository } from "../repositories/usuarioRepository.js";
import { validar } from "../middlewares/validar.js";
import { entrarSchema } from "../validators/autenticacaoValidator.js";

const rotas = Router();
const controller = new AutenticacaoController(new AutenticacaoService(new UsuarioRepository()));

rotas.post("/entrar", validar(entrarSchema), controller.entrar);

export default rotas;