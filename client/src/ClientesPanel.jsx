import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";
import { useClientes } from "./ClientesContext";
import ClienteModal from "./ClienteModal";

export default function ClientesPanel() {
  const {
    clientes,
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    carregandoClientes,
    erroClientes,
    paginacao,
    carregarClientes,
  } = useClientes();

  const [busca, setBusca] = useState("");
  const [erroOperacao, setErroOperacao] = useState("");
  // null | { mode: "edit" | "create", cliente?: cliente }
  const [modal, setModal] = useState(null);
  const carregarClientesRef = useRef(carregarClientes);

  useEffect(() => {
    carregarClientesRef.current = carregarClientes;
  }, [carregarClientes]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      carregarClientesRef.current({
        busca,
        pagina: 1,
        limite: paginacao.limite,
      });
    }, 300);

    return () => clearTimeout(temporizador);
  }, [busca, paginacao.limite]);

  const handleSave = async (data) => {
    setErroOperacao("");

    if (modal?.mode === "edit" && modal.cliente) {
      await atualizarCliente(modal.cliente.idCliente, data);
    } else if (modal?.mode === "create") {
      await adicionarCliente(data);
    }

    await carregarClientes({
      busca,
      pagina: paginacao.pagina,
      limite: paginacao.limite,
    });
    setModal(null);
  };

  const handleDelete = async (e, idCliente) => {
    e.stopPropagation();
    setErroOperacao("");

    try {
      await removerCliente(idCliente);
      const paginaAposExclusao =
        clientes.length === 1 && paginacao.pagina > 1
          ? paginacao.pagina - 1
          : paginacao.pagina;

      await carregarClientes({
        busca,
        pagina: paginaAposExclusao,
        limite: paginacao.limite,
      });
    } catch (erro) {
      setErroOperacao(erro?.message || "Não foi possível remover o cliente.");
    }
  };

  function mudarPagina(novaPagina) {
    if (
      novaPagina < 1 ||
      novaPagina > paginacao.totalPaginas ||
      novaPagina === paginacao.pagina
    ) {
      return;
    }

    carregarClientes({
      busca,
      pagina: novaPagina,
      limite: paginacao.limite,
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + Novo Cliente */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-slate-500">
            {paginacao.total} cliente{paginacao.total !== 1 ? "s" : ""} cadastrado
            {paginacao.total !== 1 ? "s" : ""}
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

      {(erroOperacao || erroClientes) && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {erroOperacao || erroClientes}
        </div>
      )}

      {/* Lista ou estado vazio */}
      {carregandoClientes ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400 shadow-sm">
          Carregando clientes...
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Users size={40} className="mb-3 text-slate-300" strokeWidth={1.5} />
          <p className="text-slate-400">
            {busca.trim() === ""
              ? "Nenhum cliente cadastrado"
              : "Nenhum cliente encontrado"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clientes.map((cliente) => (
            <div
              key={cliente.idCliente}
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
                    onClick={(e) => handleDelete(e, cliente.idCliente)}
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
                      {cliente.numeroEndereco && `, ${cliente.numeroEndereco}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!carregandoClientes && paginacao.totalPaginas > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => mudarPagina(paginacao.pagina - 1)}
            disabled={paginacao.pagina <= 1}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500">
            Página {paginacao.pagina} de {paginacao.totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => mudarPagina(paginacao.pagina + 1)}
            disabled={paginacao.pagina >= paginacao.totalPaginas}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
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
