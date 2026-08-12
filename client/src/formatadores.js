/* ---------------------------------------------------------
   Formata um telefone brasileiro conforme o usuário digita:
   (11) 9000-0000  ou  (11) 90000-0000
--------------------------------------------------------- */
export function formatarTelefoneBR(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Só os dígitos — usado para comparar telefones ignorando formatação. */
export function normalizarTelefone(value) {
  return (value || "").replace(/\D/g, "");
}

/** Texto normalizado (sem espaços nas pontas, minúsculo) — usado para comparar nomes. */
export function normalizarTexto(value) {
  return (value || "").trim().toLowerCase();
}

/* ---------------------------------------------------------
   Validação nativa (HTML5) dos campos de Login/Cadastro.
   Personaliza a mensagem que o navegador mostra ao tentar
   enviar o formulário com um campo obrigatório vazio, muito
   curto ou em formato inválido (ex: email sem "@").
--------------------------------------------------------- */
export function lidarComCampoInvalido(e) {
  const campo = e.target;
  if (campo.validity.valueMissing) {
    campo.setCustomValidity("Preencha este campo.");
  } else if (campo.validity.typeMismatch && campo.type === "email") {
    campo.setCustomValidity("Digite um email válido.");
  } else if (campo.validity.tooShort) {
    campo.setCustomValidity(
      `Digite pelo menos ${campo.minLength} caracteres.`
    );
  } else {
    campo.setCustomValidity("");
  }
}

/** Limpa a mensagem de validação customizada assim que o usuário volta a digitar. */
export function limparValidacaoCampo(e) {
  e.target.setCustomValidity("");
}
