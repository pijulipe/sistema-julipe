import React, { useEffect, useRef, useState } from "react";
import { usePedidos } from "./PedidosContext.jsx";
export default function AlertasCapacidadePedidos() {
  const { pedidos, requisitar, acesso } = usePedidos();
  const [alertas, setAlertas] = useState([]);
  const requisitarRef = useRef(requisitar); requisitarRef.current = requisitar;
  useEffect(() => {
    let vigente = true;
    if (acesso?.perfilAcesso !== "GERENTE" && !acesso?.permissoes.some((m) => ["PEDIDOS", "PRODUCAO", "EXPEDICAO", "RELATORIO"].includes(m))) return;
    requisitarRef.current("/capacidade").then(({ dados }) => {
      if (!vigente) return;
      setAlertas(Object.entries(dados.totais).flatMap(([chave, quantidade]) => {
        const [data, hora, categoria] = chave.split("|");
        const limite = dados.limites.find((l) => String(l.idCategoria) === categoria)?.limite;
        return limite !== undefined && quantidade > limite ? [{ data, hora, categoria, quantidade, limite }] : [];
      }));
    }).catch(() => {});
    return () => { vigente = false; };
  }, [pedidos, acesso]);
  return alertas.map((a) => <p key={`${a.data}-${a.hora}-${a.categoria}`} className="mb-3 rounded-xl bg-amber-50 p-3 text-amber-800">Capacidade: {a.data}, {a.hora}:00 — {a.quantidade} unidades da categoria {a.categoria} (limite {a.limite}). Aviso sem bloqueio.</p>);
}
