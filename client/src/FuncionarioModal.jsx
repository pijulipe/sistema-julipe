import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import ExcecoesFuncionario from "./ExcecoesFuncionario.jsx";
import { useFuncionarios, PERFIS_ACESSO } from "./FuncionariosContext";

const MODULOS_PERMISSAO = [
  { key: "PEDIDOS", label: "Pedidos" },
  { key: "PRODUCAO", label: "Produção" },
  { key: "PRODUTO", label: "Produto" },
  { key: "COMBOS", label: "Combos" },
  { key: "RELATORIO", label: "Relatório" },
  { key: "CLIENTES", label: "Clientes" },
  { key: "ESTOQUE", label: "Estoque" },
  { key: "EXPEDICAO", label: "Expedição" },
  { key: "FUNCIONARIOS", label: "Funcionários" },
];

/**
 * mode: "create" | "edit"
 * idUsuario: obrigatório em "edit", ignorado em "create".
 *
 * Em "create", permissões e situação ativa não aparecem no formulário —
 * o backend concede as permissões iniciais e ativa a conta automaticamente.
 *
 * Em "edit", Nome e Conta ativa são salvos via atualizarDadosCadastrais
 * (PATCH /api/funcionarios/:id), com a mesma autorização de "Permissões"
 * (acoesPermitidas.editarPermissoes). E-mail e Senha ainda são só visuais:
 * alterá-los mexe na conta de autenticação do Supabase, não só no perfil
 * do banco, e essa rota ainda não existe.
 */
export default function FuncionarioModal({ mode, idUsuario, onClose }) {
  const {
    buscarFuncionario,
    atualizarPerfil,
    atualizarPermissoes,
    atualizarDadosCadastrais,
    criarFuncionario,
  } = useFuncionarios();
  const isCreate = mode === "create";

  const [funcionario, setFuncionario] = useState(null);
  const [carregando, setCarregando] = useState(!isCreate);
  const [erro, setErro] = useState("");

  const [perfilSelecionado, setPerfilSelecionado] = useState("");
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState([]);

  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [salvandoPermissoes, setSalvandoPermissoes] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfilNovoFuncionario, setPerfilNovoFuncionario] = useState("ATENDENTE");
  const [criando, setCriando] = useState(false);

  // Campos editáveis do funcionário existente (modo "edit")
  const [nomeEditado, setNomeEditado] = useState("");
  const [emailEditado, setEmailEditado] = useState("");
  const [senhaEditada, setSenhaEditada] = useState("");
  const [contaAtiva, setContaAtiva] = useState(true);

  useEffect(() => {
    if (isCreate) return;

    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const resultado = await buscarFuncionario(idUsuario);
        if (cancelado) return;
        setFuncionario(resultado);
        setPerfilSelecionado(resultado.perfilAcesso);
        setPermissoesSelecionadas(resultado.permissoes || []);
        setNomeEditado(resultado.nome || "");
        setEmailEditado(resultado.email || "");
        setSenhaEditada("");
        setContaAtiva(resultado.ativo !== false);
      } catch (erroCarregar) {
        if (!cancelado) setErro(erroCarregar.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [idUsuario, isCreate]);

  const handleAlternarPermissao = (chave) => {
    setPermissoesSelecionadas((prev) =>
      prev.includes(chave) ? prev.filter((c) => c !== chave) : [...prev, chave]
    );
  };

  const handleSalvarPerfil = async () => {
    setErro("");
    setSalvandoPerfil(true);
    try {
      await atualizarPerfil(idUsuario, perfilSelecionado);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const nomeEditadoValido = nomeEditado.trim().length >= 2;
  const dadosCadastraisAlterados =
    funcionario &&
    (nomeEditado.trim() !== (funcionario.nome || "") ||
      contaAtiva !== (funcionario.ativo !== false));

  const handleSalvarDados = async () => {
    setErro("");
    setSalvandoDados(true);
    try {
      await atualizarDadosCadastrais(idUsuario, {
        nome: nomeEditado.trim(),
        ativo: contaAtiva,
      });
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleSalvarPermissoes = async () => {
    setErro("");
    setSalvandoPermissoes(true);
    try {
      await atualizarPermissoes(idUsuario, permissoesSelecionadas);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvandoPermissoes(false);
    }
  };

  const canSubmitCriar = nome.trim() && email.trim() && senha.trim();

  const handleCriar = async () => {
    if (!canSubmitCriar) return;
    setErro("");
    setCriando(true);
    try {
      await criarFuncionario({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        perfilAcesso: perfilNovoFuncionario,
      });
      onClose();
    } catch (erroCriar) {
      setErro(erroCriar.message);
    } finally {
      setCriando(false);
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
            {isCreate ? "Novo Funcionário" : "Editar Funcionário"}
          </h2>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {funcionario && <ExcecoesFuncionario key={funcionario.idUsuario} funcionario={funcionario} />}
          {erro && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          {isCreate ? (
            <>
              <Field label="Nome" required>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do funcionário"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="E-mail" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Senha" required>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Perfil de Acesso
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PERFIS_ACESSO.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPerfilNovoFuncionario(p.key)}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                        perfilNovoFuncionario === p.key
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : carregando ? (
            <p className="text-sm text-slate-400">Carregando funcionário...</p>
          ) : funcionario ? (
            <>
              <Field label="Nome" required>
                <input
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  disabled={!funcionario.acoesPermitidas.editarPermissoes}
                  placeholder="Nome do funcionário"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </Field>

              <Field label="E-mail" required>
                <input
                  type="email"
                  value={emailEditado}
                  onChange={(e) => setEmailEditado(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Senha (deixe em branco para manter)">
                <input
                  type="password"
                  value={senhaEditada}
                  onChange={(e) => setSenhaEditada(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Perfil de Acesso
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PERFIS_ACESSO.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      disabled={!funcionario.acoesPermitidas.alterarPerfil}
                      onClick={() => setPerfilSelecionado(p.key)}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        perfilSelecionado === p.key
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {funcionario.acoesPermitidas.alterarPerfil && (
                  <button
                    type="button"
                    onClick={handleSalvarPerfil}
                    disabled={salvandoPerfil || perfilSelecionado === funcionario.perfilAcesso}
                    className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
                  </button>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={contaAtiva}
                    onChange={(e) => setContaAtiva(e.target.checked)}
                    disabled={!funcionario.acoesPermitidas.editarPermissoes}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  Conta ativa
                </label>
                {funcionario.acoesPermitidas.editarPermissoes && (
                  <button
                    type="button"
                    onClick={handleSalvarDados}
                    disabled={salvandoDados || !nomeEditadoValido || !dadosCadastraisAlterados}
                    className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoDados ? "Salvando..." : "Salvar dados"}
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Permissões
                </label>
                {funcionario.acessoTotal ? (
                  <p className="text-xs text-slate-400">
                    Este funcionário tem acesso total ao sistema e não usa permissões individuais.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {MODULOS_PERMISSAO.map((m) => {
                        const marcado = permissoesSelecionadas.includes(m.key);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            disabled={!funcionario.acoesPermitidas.editarPermissoes}
                            onClick={() => handleAlternarPermissao(m.key)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              marcado
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                marcado ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"
                              }`}
                            >
                              {marcado && <Check size={11} className="text-white" strokeWidth={3} />}
                            </span>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    {funcionario.acoesPermitidas.editarPermissoes && (
                      <button
                        type="button"
                        onClick={handleSalvarPermissoes}
                        disabled={salvandoPermissoes}
                        className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {salvandoPermissoes ? "Salvando..." : "Salvar permissões"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {isCreate ? "Cancelar" : "Fechar"}
          </button>
          {isCreate && (
            <button
              onClick={handleCriar}
              disabled={!canSubmitCriar || criando}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {criando ? "Criando..." : "Criar"}
            </button>
          )}
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
