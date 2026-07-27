import React, { useState } from "react";
import { useClients } from "./ClientsContext";
import { formatPhoneBR } from "./formatters";

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  number: "",
  neighborhood: "",
  reference: "",
  notes: "",
};

/**
 * mode: "edit" | "create"
 * client: obrigatório para "edit"
 */
export default function ClientModal({ mode, client, onClose, onSave }) {
  const { findClientByPhone } = useClients();

  const [form, setForm] = useState(() =>
    mode === "edit" && client
      ? {
          name: client.name || "",
          phone: client.phone || "",
          address: client.address || "",
          number: client.number || "",
          neighborhood: client.neighborhood || "",
          reference: client.reference || "",
          notes: client.notes || "",
        }
      : emptyForm
  );
  const [error, setError] = useState("");

  const handleChange = (field) => (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePhoneChange = (e) => {
    setError("");
    setForm((prev) => ({ ...prev, phone: formatPhoneBR(e.target.value) }));
  };

  const canSubmit = form.name.trim() && form.phone.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;

    const duplicate = findClientByPhone(
      form.phone,
      mode === "edit" ? client?.id : undefined
    );
    if (duplicate) {
      setError(
        `Já existe um cliente cadastrado com esse telefone: ${duplicate.name}`
      );
      return;
    }

    onSave({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(),
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    });
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
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Nome do cliente"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Telefone" required>
            <input
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="(11) 90000-0000"
              inputMode="numeric"
              maxLength={16}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <div className="grid grid-cols-[1fr_110px] gap-4">
            <Field label="Endereço">
              <input
                value={form.address}
                onChange={handleChange("address")}
                placeholder="Rua, avenida..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Número">
              <input
                value={form.number}
                onChange={handleChange("number")}
                placeholder="Nº"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bairro">
              <input
                value={form.neighborhood}
                onChange={handleChange("neighborhood")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Ponto de Referência">
              <input
                value={form.reference}
                onChange={handleChange("reference")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={form.notes}
              onChange={handleChange("notes")}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>

        <div className="flex gap-3 px-6 pb-6">
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
            {mode === "edit" ? "Salvar" : "Criar"}
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
