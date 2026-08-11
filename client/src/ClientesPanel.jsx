import React, { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, Phone, MapPin, Navigation, Users } from "lucide-react";
import { useClientes } from "./ClientesContext";
import ClienteModal from "./ClienteModal";

export default function ClientesPanel() {
  const { clientes, adicionarCliente, atualizarCliente, removerCliente } = useClientes();

  const [busca, setBusca] = useState("");
  // null | { mode: "edit" | "create", cliente?: cliente }
  const [modal, setModal] = useState(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        (c.bairro || "").toLowerCase().includes(q)
    );
  }, [clientes, busca]);

  const handleSave = (data) => {
    if (modal?.mode === "edit" && modal.cliente) {
      atualizarCliente(modal.cliente.id, data);
    } else if (modal?.mode === "create") {
      adicionarCliente(data);
    }
    setModal(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    removerCliente(id);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + Novo Cliente */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-slate-500">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado
            {clientes.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          <Plus size={18} strokeWidth={2.5} />
          Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou bairro..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Lista ou estado vazio */}
      {filtrados.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Users size={40} className="mb-3 text-slate-300" strokeWidth={1.5} />
          <p className="text-slate-400">
            {clientes.length === 0
              ? "Nenhum cliente cadastrado"
              : "Nenhum cliente encontrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((cliente) => (
            <div
              key={cliente.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {cliente.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {cliente.nome}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Phone size={12} /> {cliente.telefone}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setModal({ mode: "edit", cliente })}
                    className="text-slate-400 transition-colors hover:text-blue-600"
                    aria-label="Editar cliente"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, cliente.id)}
                    className="text-slate-400 transition-colors hover:text-red-600"
                    aria-label="Remover cliente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {(cliente.bairro || cliente.endereco) && (
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  {cliente.bairro && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={13} className="shrink-0 text-slate-400" />
                      {cliente.bairro}
                    </div>
                  )}
                  {cliente.endereco && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Navigation size={13} className="shrink-0 text-slate-400" />
                      {cliente.endereco}
                      {cliente.number && `, ${cliente.number}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ClienteModal
          mode={modal.mode}
          cliente={modal.cliente}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
