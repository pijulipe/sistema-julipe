import React, { useEffect, useRef, useState } from "react";
import { usePedidos } from "./PedidosContext.jsx";
import { formatarCentavos } from "./FormularioPedido.jsx";

// [chave, rótulo, cor do valor]
const campos = [
  ["faturamentoCentavos", "Faturamento", "text-slate-900"],
  ["recebidoCentavos", "Recebido bruto", "text-emerald-600"],
  ["estornadoCentavos", "Estornado", "text-red-600"],
  ["liquidoCentavos", "Recebido líquido", "text-emerald-600"],
  ["excedenteCentavos", "Excedente", "text-purple-600"],
];

export default function ResumoFinanceiroPedidos({ dataInicio, dataFim, resumoFornecido, className = "mb-5" }) {
  const { requisitar, pedidos } = usePedidos();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");
  const requisitarRef = useRef(requisitar); requisitarRef.current = requisitar;
  useEffect(() => {
    if (resumoFornecido) return;
    let vigente = true;
    const consulta = new URLSearchParams(Object.entries({ dataInicio, dataFim }).filter(([, valor]) => valor));
    requisitarRef.current(`/indicadores?${consulta}`).then(({ dados }) => { if (vigente) { setResumo(dados); setErro(""); } }).catch((falha) => { if (vigente) setErro(falha.message); });
    return () => { vigente = false; };
  }, [dataInicio, dataFim, pedidos, resumoFornecido]);
  const valores = resumoFornecido || resumo;
  if (erro && !resumoFornecido) return <p role="alert" className={`rounded-2xl bg-white p-4 text-sm text-red-600 shadow-sm ${className}`}>{erro}</p>;
  if (!valores) return <p className={`rounded-2xl bg-white p-4 text-sm text-slate-400 shadow-sm ${className}`}>Carregando indicadores…</p>;

  // Se a API não enviar o líquido, ele é calculado: recebido bruto − estornado.
  const valorDe = (chave) => chave === "liquidoCentavos" && valores.liquidoCentavos == null
    ? Number(valores.recebidoCentavos || 0) - Number(valores.estornadoCentavos || 0)
    : valores[chave];

  return <div className={className}>
    <dl className="grid grid-cols-2 gap-y-5 rounded-2xl bg-white px-2 py-4 shadow-sm sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-0">
      {campos.map(([chave, nome, cor]) => <div key={chave} className="px-4 lg:border-l lg:border-slate-100 lg:first:border-l-0">
        <dt className="text-xs text-slate-500">{nome}</dt>
        <dd className={`mt-1 text-xl font-bold ${cor}`}>{formatarCentavos(valorDe(chave))}</dd>
      </div>)}
    </dl>
    {valores.legados > 0 && <p className="mt-2 text-sm text-amber-700">{valores.legados} registros legados aguardam reconciliação e não compõem estes valores.</p>}
  </div>;
}
