/* ---------------------------------------------------------
   Formata um telefone brasileiro conforme o usuário digita:
   (11) 9000-0000  ou  (11) 90000-0000
--------------------------------------------------------- */
export function formatPhoneBR(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Só os dígitos — usado para comparar telefones ignorando formatação. */
export function normalizePhone(value) {
  return (value || "").replace(/\D/g, "");
}

/** Texto normalizado (sem espaços nas pontas, minúsculo) — usado para comparar nomes. */
export function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}
