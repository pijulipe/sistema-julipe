import React, { useEffect, useRef, useState } from "react";
import { usePedidos } from "./PedidosContext.jsx";
import { formatarCentavos } from "./FormularioPedido.jsx";
export default function ResumoFinanceiroPedidos({ dataInicio, dataFim, resumoFornecido }) {
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
  if (erro && !resumoFornecido) return <p role="alert">{erro}</p>;
  if (!valores) return <p>Carregando indicadores…</p>;
  const campos = resumoFornecido
    ? [["faturamentoCentavos", "Faturamento"], ["recebidoCentavos", "Recebido bruto"], ["estornadoCentavos", "Estornado"], ["liquidoCentavos", "Recebido líquido"], ["excedenteCentavos", "Excedente"]]
    : [["faturamentoCentavos", "Faturamento"], ["recebidoCentavos", "Recebimentos"], ["estornadoCentavos", "Estornos"], ["excedenteCentavos", "Excedente"]];
  return <div className="mb-5 rounded-xl border bg-white p-4"><div className="flex flex-wrap gap-6">{campos.map(([chave, nome]) => <div key={chave}><p className="text-sm text-slate-500">{nome}</p><strong>{formatarCentavos(valores[chave])}</strong></div>)}</div>{valores.legados > 0 && <p className="mt-2 text-amber-700">{valores.legados} registros legados aguardam reconciliação e não compõem estes valores.</p>}</div>;
}
