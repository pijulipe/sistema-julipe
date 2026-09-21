import React from "react";
import ValoresHistoricoPedido from "./ValoresHistoricoPedido.jsx";

export default function ConflitoEdicaoPedido({ conflito, reabrindo, onConsultar, onContinuar }) {
  if (!conflito) return null;
  const fechado = ["ENTREGUE", "CANCELADO"].includes(conflito.status);
  return <div role="alert" className="space-y-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
    <p>O pedido foi alterado. Seus dados preenchidos foram preservados. Compare a versão atual antes de continuar.</p>
    {conflito.carregando ? <p>Consultando versão atual…</p> : conflito.erro ? <>
      <p>{conflito.erro}</p>
      <button type="button" onClick={onConsultar}>Tentar consultar novamente</button>
    </> : <>
      <details><summary>Ver dados atuais do pedido</summary>
        <ValoresHistoricoPedido valor={conflito.fotografia} />
        {conflito.pendencia?.dados && <ValoresHistoricoPedido valor={{ proposta: conflito.pendencia.dados }} />}
      </details>
      {fechado && !reabrindo
        ? <p>O pedido foi concluído ou cancelado. A edição exige reabertura pelo gerente.</p>
        : <button type="button" className="font-semibold underline" onClick={onContinuar}>Manter meus dados e revisar novamente</button>}
    </>}
  </div>;
}
