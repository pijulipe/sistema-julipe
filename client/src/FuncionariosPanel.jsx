import React, { useEffect, useRef, useState } from "react";
import { Search, Plus, Pencil, Shield, UserRound } from "lucide-react";
import { useFuncionarios, PERFIS_ACESSO } from "./FuncionariosContext";
import FuncionarioModal, { IconeFuncionario } from "./FuncionarioModal";

const perfilMeta = {
  ADMINISTRADOR: { label: "Administrador", bg: "#fee2e2", text: "#dc2626" },
  GERENTE: { label: "Gerente", bg: "#fef3c7", text: "#b45309" },
  ATENDENTE: { label: "Atendente", bg: "#dbeafe", text: "#2563eb" },
};

export default function FuncionariosPanel() {
  const {
    funcionarios,
    carregandoFuncionarios,
    erroFuncionarios,
    paginacao,
    carregarFuncionarios
  } = useFuncionarios();

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  // null | { mode: "edit" | "create", funcionario?: funcionario }
  const [modal, setModal] = useState(null);
  const carregarFuncionariosRef = useRef(carregarFuncionarios);

  useEffect(() => { carregarFuncionariosRef.current = carregarFuncionarios; }, [carregarFuncionarios]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      carregarFuncionariosRef.current({
        busca,
        perfilAcesso: filtroPerfil !== "todos" ? filtroPerfil : undefined,
        pagina: 1,
        limite: paginacao.limite,
      });
    }, 300);

    return () => clearTimeout(temporizador);
  }, [busca, filtroPerfil, paginacao.limite]);

  function mudarPagina(novaPagina) {
    if (
      novaPagina < 1 ||
      novaPagina > paginacao.totalPaginas ||
      novaPagina === paginacao.pagina
    ) {
      return;
    }

    carregarFuncionarios({
      busca,
      perfilAcesso: filtroPerfil !== "todos" ? filtroPerfil : undefined,
      pagina: novaPagina,
      limite: paginacao.limite,
    });
  }


  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Título + Novo Funcionário */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Funcionários</h1>
          <p className="mt-1 text-slate-500">
            {paginacao.total} funcionário{paginacao.total !== 1 ? "s" : ""}{" "}
            cadastrado{paginacao.total !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          <Plus size={18} strokeWidth={2.5} />
          Novo Funcionário
        </button>
      </div>

      {/* Busca + filtro de perfil */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filtroPerfil}
          onChange={(e) => setFiltroPerfil(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os perfis</option>
          {PERFIS_ACESSO.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {(erroFuncionarios) && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {erroFuncionarios}
        </div>
      )}


      {/* Lista ou estado vazio */}
      {carregandoFuncionarios ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400 shadow-sm">Carregando funcionários...</div>
      ) :

        funcionarios.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
            <UserRound size={40} className="mb-3 text-slate-300" strokeWidth={1.5} />
            <p className="text-slate-400">
              {funcionarios.length === 0
                ? "Nenhum funcionário cadastrado"
                : "Nenhum funcionário encontrado"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {funcionarios.map((funcionario) => {
              const meta = perfilMeta[funcionario.perfilAcesso] || perfilMeta.ATENDENTE;
              const ativo = funcionario.ativo;

              return (
                <div
                  key={funcionario.idUsuario}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <IconeFuncionario nome={funcionario.nome} />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {funcionario.nome}
                        </div>
                        <div className="text-xs text-slate-400">
                          {funcionario.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => setModal({ mode: "edit", funcionario: funcionario.idUsuario })}
                        className="text-slate-400 transition-colors hover:text-blue-600"
                        aria-label="Editar funcionário"
                      >
                        <Pencil size={16} />
                      </button>

                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: meta.bg, color: meta.text }}
                    >
                      <Shield size={12} />
                      {meta.label}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-xs font-medium ${ativo ? "text-green-600" : "text-slate-400"
                        }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: ativo ? "#22c55e" : "#cbd5e1" }}
                      />
                      {ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {!carregandoFuncionarios && paginacao.totalPaginas > 1 && (
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
        <FuncionarioModal
          mode={modal.mode}
          idUsuario={modal.funcionario}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
