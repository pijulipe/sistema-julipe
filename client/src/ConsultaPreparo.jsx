import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { usePedidos } from "./PedidosContext.jsx";
import { LightboxReferencia, MiniaturaImagemReferencia } from "./FotosReferencia.jsx";
import ValoresHistoricoPedido from "./ValoresHistoricoPedido.jsx";
import { alteracaoPreparoAuditada, etapasProducao, fotografiaPreparo, produtosParaPreparo } from "./utils/producao.js";

export default function ConsultaPreparo({ id, onClose }) {
  const { pedidos, requisitar } = usePedidos();
  const pedido = pedidos.find((item) => item.id === id);
  const [pagina, setPagina] = useState(1);
  const [historico, setHistorico] = useState([]);
  const [fotos, setFotos] = useState(null);
  const [erroHistorico, setErroHistorico] = useState("");
  const [erroFotos, setErroFotos] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [imagem, setImagem] = useState(null);
  const requisitarRef = useRef(requisitar);
  requisitarRef.current = requisitar;

  useEffect(() => {
    let vigente = true;
    setCarregando(true); setErroHistorico(""); setHistorico([]);
    requisitarRef.current(`/${id}/historico?pagina=${pagina}`).then((resposta) => {
      if (vigente) setHistorico(resposta.dados);
    }).catch((falha) => { if (vigente) setErroHistorico(falha.message); })
      .finally(() => { if (vigente) setCarregando(false); });
    return () => { vigente = false; };
  }, [id, pedido?.revisao, pagina, tentativa]);

  useEffect(() => {
    let vigente = true;
    setFotos(null); setImagem(null); setErroFotos("");
    // A versão explícita impede associar uma foto de uma revisão posterior ao item exibido.
    if (pedido?.versao > 0) requisitarRef.current(`/${id}/fotos?versao=${pedido.versao}`).then((resposta) => {
      if (vigente) setFotos(resposta.dados);
    }).catch((falha) => { if (vigente) setErroFotos(falha.message); });
    return () => { vigente = false; };
  }, [id, pedido?.versao, tentativa]);

  const fotografia = pedido?.fotografia;
  const alteracoes = historico.filter(alteracaoPreparoAuditada);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
    <section role="dialog" aria-modal="true" aria-label="Consulta de preparo" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <header className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Preparo do pedido #{id}</h2><p className="text-sm text-slate-500">{pedido?.cliente?.nome} · {pedido?.dataEntrega?.split("-").reverse().join("/")} às {pedido?.horarioEntrega}</p><p className="text-xs text-slate-400">Versão {pedido?.versao} · revisão {pedido?.revisao}</p></div><button aria-label="Fechar consulta" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></header>
      {!pedido ? <p role="alert">Pedido indisponível.</p> : !fotografia ? <p role="alert">Registro legado: informações de preparo não disponíveis. Reconciliação necessária.</p> : <div className="space-y-4 text-sm text-slate-700">
        {!etapasProducao.includes(pedido.status) && <p role="status" className="rounded-xl bg-amber-50 p-3">Este pedido saiu da fila de Produção. Situação atual: {pedido.status.replaceAll("_", " ")}.</p>}
        {pedido.pendencia?.impedimentos?.length > 0 && <div className="rounded-xl bg-amber-50 p-3"><strong>Atualização pendente — versão válida preservada</strong>{pedido.pendencia.impedimentos.map((pendencia, indice) => <p key={indice}>{pendencia.mensagem}</p>)}<p>Consulte quem tem acesso a Pedidos para corrigir as pendências.</p></div>}
        {fotografia.avisos?.map((aviso, indice) => <p key={indice} className="rounded-xl bg-amber-50 p-3">{aviso.mensagem}</p>)}
        <div><strong>Observações gerais</strong><p className="whitespace-pre-wrap">{fotografia.observacoes || "Sem observações."}</p></div>
        <div><strong>Personalização</strong><p className="whitespace-pre-wrap">{fotografia.detalhesPersonalizacao || "Sem personalização informada."}</p></div>
        {erroFotos && <p role="alert" className="text-red-600">Falha ao consultar fotos: {erroFotos} <button className="underline" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></p>}
        {!fotos && !erroFotos && <p role="status" className="text-slate-400">Consultando fotos de referência…</p>}
        <ul className="space-y-3">{fotografia.itens.map((item) => {
          const foto = fotos?.itens?.find((registro) => registro.chaveItem === item.chaveItem);
          return <li key={item.chaveItem} className="rounded-xl bg-amber-50/80 p-3"><div className="flex items-center justify-between gap-3"><strong>{item.quantidade} {item.tipo === "COMBO" ? "combo(s)" : "unidades"} · {item.nome}</strong>{foto?.urlFoto && <MiniaturaImagemReferencia src={foto.urlFoto} alt={item.nome} size={48} onOpen={setImagem} />}</div>
            {item.tipo === "COMBO" && <ul className="mt-2 space-y-1">{produtosParaPreparo(item).map((produto, indice) => <li key={indice}>{produto.quantidade} unidades de {produto.nome}</li>)}</ul>}
            <p className="mt-2 whitespace-pre-wrap">{item.observacoes || "Sem observações do item."}</p>
            {item.foto && fotos && !foto?.urlFoto && <p className="text-amber-800">Foto de referência indisponível. <button className="underline" onClick={() => setTentativa((valor) => valor + 1)}>Consultar novamente</button></p>}
          </li>;
        })}</ul>
      </div>}
      <h3 className="mb-2 mt-6 font-bold text-slate-900">Alterações de preparo</h3>
      {carregando ? <p role="status" className="text-sm text-slate-400">Consultando auditoria…</p> : erroHistorico ? <p role="alert" className="text-sm text-red-600">{erroHistorico} <button className="underline" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></p> : <>
        {!alteracoes.length && <p className="text-sm text-slate-500">Nenhuma alteração de preparo nos eventos desta página.</p>}
        {alteracoes.map((evento) => <details key={evento.idEvento} className="border-b border-slate-100 py-3 text-sm"><summary className="cursor-pointer font-semibold text-amber-800">Preparo alterado · versão {evento.versao} · {new Date(evento.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {evento.nomeAutor}</summary><div className="mt-3"><ValoresHistoricoPedido valor={{ anterior: fotografiaPreparo(evento.dados.anterior), novo: fotografiaPreparo(evento.dados.novo) }} /></div></details>)}
      </>}
      <nav aria-label="Páginas das alterações" className="mt-4 flex items-center gap-4 text-sm text-slate-500"><button disabled={carregando || pagina === 1} onClick={() => setPagina((valor) => valor - 1)} className="disabled:opacity-40">Mais recentes</button><span>Página {pagina}</span><button disabled={carregando || Boolean(erroHistorico) || historico.length < 50} onClick={() => setPagina((valor) => valor + 1)} className="disabled:opacity-40">Mais antigos</button></nav>
    </section>
    <LightboxReferencia imagem={imagem} onClose={() => setImagem(null)} />
  </div>;
}
