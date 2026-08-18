export default function CarregamentoAutenticacao() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
        role="status"
        aria-label="Verificando sessão"
      />
      <p className="text-sm text-slate-500">Verificando sessão...</p>
    </div>
  );
}
