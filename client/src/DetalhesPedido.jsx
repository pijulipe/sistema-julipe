import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { usePedidos } from "./PedidosContext.jsx";
import FormularioPedido, { formatarCentavos } from "./FormularioPedido.jsx";
import { comSessaoGerente } from "./services/autorizacaoPedidoService.js";
import ValoresHistoricoPedido from "./ValoresHistoricoPedido.jsx";
const campo = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const rotulos = { RECEBIDO: "Recebido", EM_PRODUCAO: "Em produção", PRONTO: "Pronto", EM_ROTA: "Em rota", ENTREGUE: "Entregue" };
export default function DetalhesPedido({ id, onClose }) {
  const { pedidos, requisitar, executar, acesso } = usePedidos();
  const pedido = pedidos.find((p) => p.id === id);
  const [editando, setEditando] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [versaoConsultada, setVersaoConsultada] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pagamento, setPagamento] = useState({ valor: "", forma: "PIX", situacao: "CONFIRMADO", realizadoEm: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) });
  const [estorno, setEstorno] = useState({ idPagamento: "", valor: "", motivo: "" });
  const [motivo, setMotivo] = useState("");
  const [gerente, setGerente] = useState({ email: "", senha: "" });
  const requisitarRef = useRef(requisitar); requisitarRef.current = requisitar;
  useEffect(() => {
    let vigente = true;
    Promise.all([requisitarRef.current(`/${id}/historico?pagina=${paginaHistorico}`), requisitarRef.current(`/${id}/fotos`)]).then(([eventos, fotografias]) => {
      if (vigente) { setHistorico(eventos.dados); setFotos(fotografias.dados?.itens || []); }
    }).catch((falha) => { if (vigente) setErro(falha.message); });
    return () => { vigente = false; };
  }, [id, pedido?.revisao, paginaHistorico]);
  async function agir(acao, dados = {}, token) {
    if (ocupado) return;
    setOcupado(true); setErro(""); setSucesso("");
    try { await executar(id, acao, dados, token); setSucesso("Operação registrada com sucesso."); }
    catch (falha) { setErro(falha.message); }
    finally { setOcupado(false); }
  }
  async function autorizar() {
    setOcupado(true); setErro("");
    try {
      await comSessaoGerente(gerente.email, gerente.senha, (token) => executar(id, "autorizacao-desconto", { assinatura: pedido.pendencia.assinatura }, token));
      setSucesso("Desconto autorizado e versão efetivada.");
    } catch (falha) { setErro(falha.message); }
    finally { setGerente({ email: "", senha: "" }); setOcupado(false); }
  }
  async function consultarVersao(versao) {
    try { const resposta = await requisitar(`/${id}/fotos?versao=${versao}`); setVersaoConsultada({ numero: versao, fotografia: resposta.dados }); }
    catch (falha) { setErro(falha.message); }
  }
  if (!pedido) return <div role="alert" className="p-6">Pedido indisponível. <button onClick={onClose}>Fechar</button></div>;
  if (editando) return <FormularioPedido pedido={pedido} reabrindo={["entregue", "cancelado"].includes(pedido.status)} onClose={() => setEditando(false)} />;
  const fechado = ["entregue", "cancelado"].includes(pedido.status);
  const gerenteAtual = acesso?.perfilAcesso === "GERENTE";
  const podeEditar = gerenteAtual || acesso?.permissoes.includes("PEDIDOS");
  const temProducao = acesso?.permissoes.includes("PRODUCAO");
  const temExpedicao = acesso?.permissoes.includes("EXPEDICAO");
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Detalhes do pedido" className="max-h-[92vh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6">
    <div className="flex justify-between"><h2 className="text-2xl font-bold">Pedido #{id} · versão {pedido.versao}</h2><button onClick={onClose} aria-label="Fechar"><X /></button></div>
    {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{erro}</p>}{sucesso && <p role="status" className="rounded-lg bg-green-50 p-3">{sucesso}</p>}
    {pedido.legado ? <p>Registro legado preservado. Necessita reconciliação antes de novas operações.</p> : <>
      <p><strong>{pedido.cliente.nome}</strong> · {pedido.dataEntrega} às {pedido.horarioEntrega} · {pedido.status === "entregue" && pedido.tipoEntrega === "retirada" ? "Retirado" : pedido.status.replaceAll("_", " ")}</p>
      <p>{pedido.endereco}</p><p>{pedido.observacoes}</p>
      <div className="rounded-xl bg-blue-50 p-4"><strong>Total: {formatarCentavos(pedido.fotografia.totalCentavos)}</strong><p>Recebido: {formatarCentavos(pedido.financeiro.recebidoCentavos)} · Estornado: {formatarCentavos(pedido.financeiro.estornadoCentavos)} · Excedente: {formatarCentavos(pedido.financeiro.excedenteCentavos)}</p><p>Situação financeira: {pedido.financeiro.situacao}</p></div>
      {pedido.status === "cancelado" && Number(pedido.financeiro.liquidoCentavos) > 0 && <p className="bg-amber-50 p-3">Pedido cancelado com valores recebidos. Estorno manual pendente.</p>}
      {pedido.fotografia.avisos?.map((a, i) => <p className="text-amber-700" key={i}>{a.mensagem}</p>)}
      {pedido.pendencia?.impedimentos?.length > 0 && <div className="rounded-xl bg-amber-50 p-4"><strong>Atualização pendente — a versão válida foi preservada</strong>{pedido.pendencia.impedimentos.map((i, indice) => <p key={indice}>{i.mensagem}</p>)}{podeEditar && !fechado && <button className={campo} onClick={() => setEditando(true)}>Corrigir proposta</button>}{pedido.pendencia.impedimentos.some((i) => i.codigo === "AUTORIZACAO") && !fechado && <div className="mt-3 space-y-2"><p>O gerente deve revisar a proposta antes de autorizar.</p><details><summary>Ver proposta</summary><ValoresHistoricoPedido valor={pedido.pendencia.fotografia} /></details>{gerenteAtual ? <button disabled={ocupado} className={campo} onClick={() => agir("autorizacao-desconto", { assinatura: pedido.pendencia.assinatura })}>Autorizar esta versão</button> : <><input className={campo} placeholder="E-mail do gerente" type="email" value={gerente.email} onChange={(e) => setGerente({ ...gerente, email: e.target.value })} /><input className={campo} placeholder="Senha do gerente" type="password" autoComplete="off" value={gerente.senha} onChange={(e) => setGerente({ ...gerente, senha: e.target.value })} /><button disabled={ocupado} className={campo} onClick={autorizar}>Autorizar esta versão</button></>}</div>}</div>}
      <ul className="divide-y">{pedido.fotografia.itens.map((item) => <li key={item.chaveItem} className="py-3"><strong>{item.nome}</strong> · {item.quantidade} unidades · {formatarCentavos(item.subtotalCentavos)}<p>{item.observacoes}</p>{item.tipo === "COMBO" && <p className="text-sm">{item.composicao.map((p) => `${p.nome}: ${p.quantidade}`).join(" · ")}</p>}{fotos.find((f) => f.chaveItem === item.chaveItem)?.urlFoto && <img className="mt-2 max-h-48 rounded-lg" alt={`Referência de ${item.nome}`} src={fotos.find((f) => f.chaveItem === item.chaveItem).urlFoto} />}</li>)}</ul>
      <fieldset disabled={ocupado} className="flex flex-wrap gap-2">{!fechado && <>{podeEditar && <button className={campo} onClick={() => setEditando(true)}>Editar pedido</button>}{Object.entries(rotulos).filter(([status]) => podeEditar || temExpedicao || (temProducao && ["RECEBIDO", "EM_PRODUCAO", "PRONTO"].includes(status))).map(([status, nome]) => <button className={campo} key={status} onClick={() => agir("status", { status })}>{status === "ENTREGUE" && pedido.tipoEntrega === "retirada" ? "Confirmar retirada" : nome}</button>)}</>}{fechado && gerenteAtual && <button className={campo} onClick={() => setEditando(true)}>Revisar e reabrir em produção</button>}</fieldset>
      {!fechado && podeEditar && acesso?.podeCancelarPedido && <details><summary>Cancelar pedido</summary><input className={campo} placeholder="Motivo opcional" value={motivo} onChange={(e) => setMotivo(e.target.value)} /><button disabled={ocupado} className={campo} onClick={() => agir("cancelamento", { motivo })}>Confirmar cancelamento</button></details>}
      <h3 className="font-bold">Pagamentos</h3>{pedido.pagamentos.map((p) => <p key={p.idPagamento}>{p.forma} · {formatarCentavos(p.valorCentavos)} · {p.situacao} · {p.nomeAutor} · {new Date(p.realizadoEm).toLocaleString("pt-BR")}{p.estornos.map((e) => <span className="block pl-4" key={e.idEstorno}>Estorno {formatarCentavos(e.valorCentavos)} · {e.nomeAutor} · {e.motivo}</span>)}</p>)}
      {podeEditar && <><form onSubmit={(e) => { e.preventDefault(); agir("pagamentos", { ...pagamento, realizadoEm: new Date(pagamento.realizadoEm).toISOString() }); }}><fieldset disabled={ocupado} className="flex flex-wrap gap-2"><input required aria-label="Valor do pagamento" className={campo} type="number" step="0.01" min="0.01" value={pagamento.valor} onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })} /><select className={campo} value={pagamento.forma} onChange={(e) => setPagamento({ ...pagamento, forma: e.target.value })}>{["PIX", "DEBITO", "CREDITO"].map((f) => <option key={f}>{f}</option>)}</select><select className={campo} value={pagamento.situacao} onChange={(e) => setPagamento({ ...pagamento, situacao: e.target.value })}><option>CONFIRMADO</option><option>REJEITADO</option></select><label>Data e hora<input required className={campo} type="datetime-local" value={pagamento.realizadoEm} onChange={(e) => setPagamento({ ...pagamento, realizadoEm: e.target.value })} /></label><button className={campo}>Registrar pagamento</button></fieldset></form>
      <details><summary>Registrar estorno</summary><form onSubmit={(e) => { e.preventDefault(); agir("estornos", estorno); }}><fieldset disabled={ocupado} className="flex flex-wrap gap-2"><select required className={campo} value={estorno.idPagamento} onChange={(e) => setEstorno({ ...estorno, idPagamento: e.target.value })}><option value="">Escolha o pagamento</option>{pedido.pagamentos.filter((p) => p.situacao === "CONFIRMADO").map((p) => <option key={p.idPagamento} value={p.idPagamento}>{p.forma} {formatarCentavos(p.valorCentavos)} — {new Date(p.realizadoEm).toLocaleString("pt-BR")}</option>)}</select><input required className={campo} aria-label="Valor do estorno" type="number" min="0.01" step="0.01" value={estorno.valor} onChange={(e) => setEstorno({ ...estorno, valor: e.target.value })} /><input className={campo} placeholder="Motivo opcional" value={estorno.motivo} onChange={(e) => setEstorno({ ...estorno, motivo: e.target.value })} /><button className={campo}>Confirmar registro de estorno</button></fieldset></form></details></>}
    </>}
    <h3 className="font-bold">Histórico</h3>{historico.map((evento) => <details className="border-b py-2" key={evento.idEvento}><summary>{new Date(evento.criadoEm).toLocaleString("pt-BR")} · {evento.nomeAutor} · {evento.acao.replaceAll("_", " ")} · versão {evento.versao}</summary><ValoresHistoricoPedido valor={evento.dados} />{evento.versao > 0 && <button className={campo} onClick={() => consultarVersao(evento.versao)}>Consultar versão {evento.versao} e fotos</button>}</details>)}
    {versaoConsultada && <section className="rounded-xl border p-4"><h3 className="font-bold">Versão histórica {versaoConsultada.numero}</h3><button onClick={() => setVersaoConsultada(null)}>Fechar versão</button><ValoresHistoricoPedido valor={versaoConsultada.fotografia} />{versaoConsultada.fotografia.itens.filter((i) => i.urlFoto).map((i) => <img key={i.chaveItem} src={i.urlFoto} alt={`Referência histórica de ${i.nome}`} className="max-h-64 rounded-lg" />)}</section>}
    <nav aria-label="Páginas do histórico" className="flex gap-3"><button disabled={paginaHistorico === 1} onClick={() => setPaginaHistorico((p) => p - 1)}>Mais recentes</button><span>Página {paginaHistorico}</span><button disabled={historico.length < 50} onClick={() => setPaginaHistorico((p) => p + 1)}>Mais antigos</button></nav>
  </section></div>;
}
