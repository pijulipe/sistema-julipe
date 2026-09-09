import { ErroAplicacao } from "../utils/erroAplicacao.js";

export function dataValida(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(`${data}T12:00:00Z`)) && new Date(`${data}T12:00:00Z`).toISOString().slice(0, 10) === data;
}
export function validarAgendamento(data, horario, expediente, agora = new Date()) {
  if (!dataValida(data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) throw new ErroAplicacao("Data ou horário inválido.", 422);
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(agora);
  const parte = (tipo) => partes.find((p) => p.type === tipo).value;
  const hoje = `${parte("year")}-${parte("month")}-${parte("day")}`;
  if (data < hoje) throw new ErroAplicacao("Não é permitido agendar em data passada.", 422);
  const dia = expediente.find((d) => d.diaSemana === new Date(`${data}T12:00:00Z`).getUTCDay());
  if (!dia?.aberto || horario < dia.inicio || horario > dia.fim || Number(horario.slice(3)) % 15 !== 0) {
    throw new ErroAplicacao("Horário fora do expediente ou do intervalo de 15 minutos.", 422);
  }
}
