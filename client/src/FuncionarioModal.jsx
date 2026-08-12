import React, { useState } from "react";
import { Check } from "lucide-react";
import {
  useFuncionarios,
  TELAS_ACESSO,
  PERFIS_ACESSO,
  perfilTemAcessoGranular,
} from "./FuncionariosContext";

const todasAsTelas = TELAS_ACESSO.map((t) => t.key);

const emptyForm = {
  nome: "",
  email: "",
  senha: "",
  perfil: "atendente",
  telasComAcesso: todasAsTelas,
  ativo: true,
};

/**
 * mode: "edit" | "create"
 * funcionario: obrigatório para "edit"
 */
export default function FuncionarioModal({ mode, funcionario, onClose, onSave }) {
  const { buscarFuncionarioPorEmail } = useFuncionarios();
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() =>
    isEdit && funcionario
      ? {
          nome: funcionario.nome || "",
          email: funcionario.email || "",
          senha: "",
          perfil: funcionario.perfil || "atendente",
          telasComAcesso: funcionario.telasComAcesso?.length
            ? funcionario.telasComAcesso
            : todasAsTelas,
          ativo: funcionario.ativo !== false,
        }
      : emptyForm
  );
  const [error, setError] = useState("");

  const handleChange = (field) => (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelecionarPerfil = (perfil) => {
    setForm((prev) => ({ ...prev, perfil }));
  };

  const handleAlternarTela = (key) => {
    setForm((prev) => ({
      ...prev,
      telasComAcesso: prev.telasComAcesso.includes(key)
        ? prev.telasComAcesso.filter((k) => k !== key)
        : [...prev.telasComAcesso, key],
    }));
  };

  // Só perfis com acesso granular (ex: Atendente) escolhem telas individuais —
  // Administrador e Gerente têm acesso total por padrão.
  const mostrarTelas = perfilTemAcessoGranular(form.perfil);

  const canSubmit =
    form.nome.trim() && form.email.trim() && (isEdit || form.senha.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;

    const duplicate = buscarFuncionarioPorEmail(
      form.email,
      isEdit ? funcionario?.id : undefined
    );
    if (duplicate) {
      setError(
        `Já existe um funcionário cadastrado com esse e-mail: ${duplicate.nome}`
      );
      return;
    }

    const dados = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      perfil: form.perfil,
      telasComAcesso: mostrarTelas ? form.telasComAcesso : todasAsTelas,
      ativo: form.ativo,
    };
    // Só envia a senha se foi digitada — em edição, campo vazio = mantém a atual.
    if (!isEdit || form.senha.trim()) {
      dados.senha = form.senha.trim();
    }

    onSave(dados);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? "Editar Funcionário" : "Novo Funcionário"}
          </h2>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Field label="Nome" required>
            <input
              value={form.nome}
              onChange={handleChange("nome")}
              placeholder="Nome do funcionário"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="E-mail" required>
            <input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="email@exemplo.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field
            label={isEdit ? "Senha (deixe em branco para manter)" : "Senha"}
            required={!isEdit}
          >
            <input
              type="password"
              value={form.senha}
              onChange={handleChange("senha")}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Perfil de Acesso" required>
            <div className="grid grid-cols-3 gap-3">
              {PERFIS_ACESSO.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelecionarPerfil(p.key)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    form.perfil === p.key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          {mostrarTelas && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Telas com Acesso
              </label>
              <p className="mb-2 text-xs text-slate-400">
                Selecione as telas que este funcionário poderá acessar.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TELAS_ACESSO.map((t) => {
                  const marcado = form.telasComAcesso.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleAlternarTela(t.key)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                        marcado
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          marcado
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {marcado && (
                          <Check size={11} className="text-white" strokeWidth={3} />
                        )}
                      </span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, ativo: !prev.ativo }))}
            className="flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                form.ativo ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"
              }`}
            >
              {form.ativo && <Check size={11} className="text-white" strokeWidth={3} />}
            </span>
            Conta ativa
          </button>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Avatar circular com a inicial do nome — usado na listagem de funcionários. */
export function IconeFuncionario({ nome, size = 40 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600"
      style={{ width: size, height: size }}
    >
      {(nome || "?").charAt(0).toUpperCase()}
    </div>
  );
}
