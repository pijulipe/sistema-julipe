import React, { useState } from "react";
import { formatarTelefoneBR } from "./formatadores";

const emptyForm = {
  nome: "",
  telefone: "",
  endereco: "",
  numeroEndereco: "",
  bairro: "",
  pontoReferencia: "",
  observacoes: "",
};

/**
 * mode: "edit" | "create"
 * cliente: obrigatório para "edit"
 */
export default function ClienteModal({ mode, cliente, onClose, onSave }) {
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(() =>
    mode === "edit" && cliente
      ? {
          nome: cliente.nome || "",
          telefone: cliente.telefone || "",
          endereco: cliente.endereco || "",
          numeroEndereco: cliente.numeroEndereco || "",
          bairro: cliente.bairro || "",
          pontoReferencia: cliente.pontoReferencia || "",
          observacoes: cliente.observacoes || "",
        }
      : emptyForm,
  );
  const [error, setError] = useState("");

  const handleChange = (field) => (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAlterarTelefone = (e) => {
    setError("");
    setForm((prev) => ({
      ...prev,
      telefone: formatarTelefoneBR(e.target.value),
    }));
  };

  const canSubmit = form.nome.trim() && form.telefone.trim();

  const handleSubmit = async () => {
    if (!canSubmit || salvando) {
      return;
    }

    setError("");
    setSalvando(true);

    try {
      await onSave({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        endereco: form.endereco.trim(),
        numeroEndereco: form.numeroEndereco.trim(),
        bairro: form.bairro.trim(),
        pontoReferencia: form.pontoReferencia.trim(),
        observacoes: form.observacoes.trim(),
      });
    } catch (erro) {
      setError(erro?.message || "Não foi possível salvar o cliente.");
    } finally {
      setSalvando(false);
    }
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
            {mode === "edit" ? "Editar Cliente" : "Novo Cliente"}
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
              placeholder="Nome do cliente"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Telefone" required>
            <input
              value={form.telefone}
              onChange={handleAlterarTelefone}
              placeholder="(11) 90000-0000"
              inputMode="numeric"
              maxLength={16}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <div className="grid grid-cols-[1fr_110px] gap-4">
            <Field label="Endereço">
              <input
                value={form.endereco}
                onChange={handleChange("endereco")}
                placeholder="Rua, avenida..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Número">
              <input
                value={form.numeroEndereco}
                onChange={handleChange("numeroEndereco")}
                placeholder="Nº"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bairro">
              <input
                value={form.bairro}
                onChange={handleChange("bairro")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Ponto de Referência">
              <input
                value={form.pontoReferencia}
                onChange={handleChange("pontoReferencia")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={form.observacoes}
              onChange={handleChange("observacoes")}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={salvando}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || salvando}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : mode === "edit" ? "Salvar" : "Criar"}
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
