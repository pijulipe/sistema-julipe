import React, { useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import { lidarComCampoInvalido, limparValidacaoCampo } from "./formatadores";
import PainelBoasVindas, { MarcaCompacta, IconeGoogle } from "./PainelBoasVindas";

/**
 * Tela de login.
 *
 * onEntrar({ email, senha }): chamado ao enviar o formulário. Pode
 * retornar uma Promise — se ela rejeitar, a mensagem de erro é exibida
 * (ex: "Email ou senha incorretos", vinda da integração com o backend).
 * onEntrarComGoogle: chamado ao clicar em "Continuar com Google".
 * onEsqueciSenha: chamado ao clicar em "Esqueceu a senha?".
 * onIrParaCadastro: chamado ao clicar em "Criar conta".
 */
export default function LoginPanel({
  onEntrar = () => {},
  onEntrarComGoogle = () => {},
  onEsqueciSenha = () => {},
  onIrParaCadastro = () => {},
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await onEntrar({ email: email.trim(), senha });
    } catch (err) {
      setErro(
        err?.message || "Não foi possível entrar. Verifique seus dados e tente novamente."
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
              <LogIn size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
            <p className="mt-1.5 text-slate-500">Acesse sua conta para continuar</p>
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
                  htmlFor="login-email"
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
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onInvalid={lidarComCampoInvalido}
                    onInput={limparValidacaoCampo}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-senha" className="text-sm font-medium text-slate-700">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={onEsqueciSenha}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="login-senha"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
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
                {enviando ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Não tem uma conta?{" "}
            <button
              type="button"
              onClick={onIrParaCadastro}
              className="font-semibold text-blue-600 hover:underline"
            >
              Criar conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
