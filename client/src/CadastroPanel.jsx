import React, { useState } from "react";
import { Mail, Lock, UserPlus } from "lucide-react";
import { lidarComCampoInvalido, limparValidacaoCampo } from "./formatadores";
import PainelBoasVindas, { MarcaCompacta, IconeGoogle } from "./PainelBoasVindas";

/**
 * Tela de cadastro.
 *
 * onCriarConta({ email, senha }): chamado ao enviar o formulário, já
 * validado (campos preenchidos, senha com no mínimo 6 caracteres e
 * igual à confirmação). Pode retornar uma Promise — se ela rejeitar,
 * a mensagem de erro é exibida (ex: "Este email já está cadastrado").
 * onEntrarComGoogle: chamado ao clicar em "Continuar com Google".
 * onIrParaLogin: chamado ao clicar em "Entrar".
 */
export default function CadastroPanel({
  onCriarConta = () => {},
  onEntrarComGoogle = () => {},
  onIrParaLogin = () => {},
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await onCriarConta({ email: email.trim(), senha });
    } catch (err) {
      setErro(
        err?.message || "Não foi possível criar a conta. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PainelBoasVindas />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <MarcaCompacta />

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-sm shadow-blue-600/30">
              <UserPlus size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Crie sua conta</h1>
            <p className="mt-1.5 text-slate-500">Cadastre-se para começar a usar</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={onEntrarComGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <IconeGoogle />
              Continuar com Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">OU</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {erro && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
              <div>
                <label
                  htmlFor="cadastro-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="cadastro-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setErro("");
                      setEmail(e.target.value);
                    }}
                    onInvalid={lidarComCampoInvalido}
                    onInput={limparValidacaoCampo}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cadastro-senha"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="cadastro-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => {
                      setErro("");
                      setSenha(e.target.value);
                    }}
                    onInvalid={lidarComCampoInvalido}
                    onInput={limparValidacaoCampo}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Mínimo de 6 caracteres.
                </p>
              </div>

              <div>
                <label
                  htmlFor="cadastro-confirmar-senha"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="cadastro-confirmar-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmarSenha}
                    onChange={(e) => {
                      setErro("");
                      setConfirmarSenha(e.target.value);
                    }}
                    onInvalid={lidarComCampoInvalido}
                    onInput={limparValidacaoCampo}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem uma conta?{" "}
            <button
              type="button"
              onClick={onIrParaLogin}
              className="font-semibold text-blue-600 hover:underline"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
