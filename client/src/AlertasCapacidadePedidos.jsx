import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { usePedidos } from "./PedidosContext.jsx";

export default function AlertasCapacidadePedidos() {
  const { pedidos, requisitar, acesso } = usePedidos();
  const [alertas, setAlertas] = useState([]);
  const requisitarRef = useRef(requisitar);
  requisitarRef.current = requisitar;

  useEffect(() => {
    let vigente = true;
    if (
      acesso?.perfilAcesso !== "GERENTE" &&
      !acesso?.permissoes.some((m) =>
        ["PEDIDOS", "PRODUCAO", "EXPEDICAO", "RELATORIO"].includes(m)
      )
    )
      return;

    requisitarRef.current("/capacidade")
      .then(({ dados }) => {
        if (!vigente) return;
        setAlertas(
          Object.entries(dados.totais).flatMap(([chave, quantidade]) => {
            const [data, hora, categoria] = chave.split("|");
            const limite = dados.limites.find(
              (l) => String(l.idCategoria) === categoria
            )?.limite;
            return limite !== undefined && quantidade > limite
              ? [{ data, hora, categoria, quantidade, limite }]
              : [];
          })
        );
      })
      .catch(() => {});

    return () => {
      vigente = false;
    };
  }, [pedidos, acesso]);

  if (alertas.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {alertas.map((a) => (
        <div
          key={`${a.data}-${a.hora}-${a.categoria}`}
          className="flex items-start gap-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-amber-300"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-xs">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <span>Alerta de Capacidade de Produção</span>
              <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-bold text-amber-800">
                Aviso sem bloqueio
              </span>
            </div>
            <p className="mt-1 text-amber-800">
              <span className="font-semibold text-amber-950">{a.data}</span> às{" "}
              <span className="font-semibold text-amber-950">{a.hora}:00</span> —{" "}
              <span className="font-semibold text-amber-950">{a.quantidade} unidades</span> da categoria{" "}
              <span className="font-semibold text-amber-950">{a.categoria}</span> (limite de {a.limite}).
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
