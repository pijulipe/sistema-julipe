import React from "react";
import { Cake } from "lucide-react";

/* ---------------------------------------------------------
   Painel esquerdo de identidade visual, compartilhado pelas
   telas de Login e Cadastro (LoginPanel e CadastroPanel).
   Fica escondido em telas pequenas — nesse caso, cada tela
   mostra sua própria versão compacta da marca no topo do
   formulário (ver <MarcaCompacta /> abaixo).
--------------------------------------------------------- */
export default function PainelBoasVindas({
  titulo = "Gestão completa da sua doceria",
  subtitulo = "Pedidos, produção, estoque, clientes e entregas — tudo em um só lugar.",
  imagemFundo = "/doceria-bg.jpg",
}) {
  return (
    <div className="relative hidden w-1/2 shrink-0 overflow-hidden lg:block">
      {/* Foto de fundo — coloque um arquivo em public/doceria-bg.jpg (ex: uma
          foto de um bolo/doce da própria doceria) para ela aparecer aqui.
          Enquanto o arquivo não existir, some sozinha e fica só o degradê. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${imagemFundo}')` }}
      />
      {/* Degradê por cima da foto (deixa o texto branco legível) + formas decorativas */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-600/90 via-rose-500/85 to-orange-400/85" />
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-rose-300/40 blur-3xl" />
      <div className="absolute -bottom-10 right-0 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

      <div className="relative flex h-full min-h-screen flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Cake size={22} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">Doceria Julipe</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            {titulo}
          </h2>
          <p className="mt-4 text-base text-white/85 xl:text-lg">{subtitulo}</p>
        </div>

        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} Doceria Julipe
        </p>
      </div>
    </div>
  );
}

/** Versão compacta da marca, exibida no topo do formulário só em telas pequenas (onde o painel acima fica oculto). */
export function MarcaCompacta() {
  return (
    <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
        <Cake size={18} className="text-white" />
      </div>
      <span className="text-base font-bold text-slate-900">Doceria Julipe</span>
    </div>
  );
}

/** Ícone "G" colorido do Google, usado no botão "Continuar com Google" das duas telas. */
export function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
