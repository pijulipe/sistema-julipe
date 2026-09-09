import React, { useEffect, useRef, useState } from "react";
import { X, ShoppingCart, User, Search, Package, Trash2 } from "lucide-react";
import { usePedidos } from "./PedidosContext.jsx";
import { useAutenticacao } from "./AutenticacaoContext.jsx";
import { criarCliente } from "./services/clienteService.js";
import { comSessaoGerente } from "./services/autorizacaoPedidoService.js";

export const formatarCentavos = (valor) => (Number(valor || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const campo = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const etapas = ["Cliente", "Produtos", "Entrega", "Pagamento"];
const camposEndereco = { rua: "Rua", numero: "Número", bairro: "Bairro", complemento: "Complemento", pontoReferencia: "Ponto de referência", cep: "CEP", cidade: "Cidade", estado: "Estado" };
const vazio = () => ({ idCliente: "", codigoComanda: "", tipoEntrega: "RETIRADA", dataEntrega: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()), horarioEntrega: "", endereco: Object.fromEntries(Object.keys(camposEndereco).map((c) => [c, ""])), observacoes: "", detalhesPersonalizacao: "", itens: [], desconto: { percentual: "0", valorFixo: "0", ordem: "PERCENTUAL_PRIMEIRO", motivo: "" } });
function dadosEditaveis(pedido) {
  const foto = pedido?.pendencia?.dados || pedido?.fotografia;
  if (!foto) return vazio();
  const base = vazio();
  for (const chave of Object.keys(base)) base[chave] = foto[chave];
  base.itens = foto.itens.map(({ chaveItem, tipo, idCadastro, quantidade, observacoes, foto: caminhoFoto }) => ({ chaveItem, tipo, idCadastro, quantidade, observacoes, foto: caminhoFoto }));
  return base;
}
export default function FormularioPedido({ pedido, onClose, reabrindo = false }) {
  const { requisitar, executar, acesso } = usePedidos();
  const { tokenInterno, fazerLogout } = useAutenticacao();
  const [abaCliente, setAbaCliente] = useState("existente");
  const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "" });
  const [dados, setDados] = useState(() => dadosEditaveis(pedido));
  const [catalogo, setCatalogo] = useState({ produtos: [], combos: [], clientes: [] });
  const [capacidade, setCapacidade] = useState({ expediente: [], totais: {}, limites: [] });
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState(0);
  const [abaProduto, setAbaProduto] = useState("PRODUTO");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [previa, setPrevia] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [gerente, setGerente] = useState({ email: "", senha: "" });
  const chave = useRef(crypto.randomUUID());
  const requisitarRef = useRef(requisitar); requisitarRef.current = requisitar;
  useEffect(() => {
    let vigente = true;
    const temporizador = setTimeout(async () => {
      try {
        const [venda, capacidadeAtual] = await Promise.all([requisitarRef.current(`/venda?busca=${encodeURIComponent(busca)}`), requisitarRef.current("/capacidade")]);
        if (vigente) { setCatalogo(venda.dados); setCapacidade(capacidadeAtual.dados); }
      } catch (falha) { if (vigente) setErro(falha.message); }
      finally { if (vigente) setCarregando(false); }
    }, 250);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [busca]);
  const alterar = (nome, valor) => { setPrevia(null); setDados((atual) => ({ ...atual, [nome]: valor })); chave.current = crypto.randomUUID(); };
  function escolherCliente(id) {
    const cliente = catalogo.clientes.find((c) => c.idCliente === id);
    alterar("idCliente", id);
    if (cliente) alterar("endereco", { ...vazio().endereco, rua: cliente.endereco || "", numero: cliente.numeroEndereco || "", bairro: cliente.bairro || "", pontoReferencia: cliente.pontoReferencia || "" });
  }
  function adicionar(tipo, idCadastro) {
    const cadastro = catalogo[tipo === "PRODUTO" ? "produtos" : "combos"].find((c) => c.id === idCadastro);
    const existente = dados.itens.find((i) => i.tipo === tipo && i.idCadastro === idCadastro);
    const quantidade = cadastro.multiploMinimo || 1;
    alterar("itens", existente ? dados.itens.map((i) => i === existente ? { ...i, quantidade: i.quantidade + quantidade } : i) : [...dados.itens, { chaveItem: crypto.randomUUID(), tipo, idCadastro, quantidade, observacoes: "", foto: null }]);
  }
  async function enviarFoto(item, arquivo) {
    if (!arquivo) return;
    setSalvando(true); setErro("");
    try {
      const { dados: upload } = await requisitar("/fotos/upload", "POST", { tipoMime: arquivo.type, tamanho: arquivo.size });
      const resposta = await fetch(upload.urlUpload, { method: "PUT", headers: { "Content-Type": arquivo.type }, body: arquivo });
      if (!resposta.ok) throw new Error("Falha no envio da foto. Selecione novamente para tentar.");
      await requisitar("/fotos/confirmar", "POST", { caminho: upload.caminho });
      alterar("itens", dados.itens.map((i) => i.chaveItem === item.chaveItem ? { ...i, foto: upload.caminho } : i));
    } catch (falha) { setErro(falha.message); } finally { setSalvando(false); }
  }
  async function salvar(evento) {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true); setErro(""); setMensagem("");
    try {
      if (!previa) {
        const resposta = await requisitar("/previa", "POST", { dados, ...(pedido && { idPedido: pedido.id }) });
        setPrevia(resposta.dados);
        return;
      }
      let autorizacao;
      if (!pedido && gerente.email && gerente.senha) {
        autorizacao = await comSessaoGerente(gerente.email, gerente.senha, async (token) => (await requisitar("/autorizacoes-novo", "POST", { idSolicitante: acesso.idUsuario, chaveOperacao: chave.current, dados }, token)).dados.autorizacao);
        setGerente({ email: "", senha: "" });
      }
      const resultado = await executar(pedido?.id || null, reabrindo ? "reabertura" : "", { dados, ...(pedido ? { revisao: pedido.revisao } : { chaveOperacao: chave.current }), ...(autorizacao && { autorizacao }) });
      if (resultado.pendencia?.impedimentos?.length) setMensagem("Proposta salva com pendências. A última versão válida continua em uso. Consulte os detalhes do pedido.");
      else setMensagem("Pedido salvo com sucesso.");
    } catch (falha) { setErro(falha.message); } finally { setSalvando(false); }
  }
  const dia = capacidade.expediente.find((d) => d.diaSemana === new Date(`${dados.dataEntrega}T12:00:00Z`).getUTCDay());
  const horarios = [];
  if (dia?.aberto) {
    const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
    for (let m = minutos(dia.inicio); m <= minutos(dia.fim); m += 15) horarios.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  const totais = {};
  for (const item of dados.itens) {
    const cadastro = catalogo[item.tipo === "PRODUTO" ? "produtos" : "combos"].find((c) => c.id === item.idCadastro);
    const composicao = item.tipo === "PRODUTO" ? [{ idCategoria: cadastro?.idCategoria, quantidade: 1 }] : cadastro?.composicao || [];
    for (const c of composicao) totais[c.idCategoria] = (totais[c.idCategoria] || 0) + c.quantidade * item.quantidade;
  }
  const anteriores = {};
  if (pedido?.fotografia && !["entregue", "cancelado"].includes(pedido.status) && pedido.dataEntrega === dados.dataEntrega && pedido.horarioEntrega.slice(0, 2) === dados.horarioEntrega.slice(0, 2)) {
    for (const item of pedido.fotografia.itens) for (const componente of item.composicao) anteriores[componente.idCategoria] = (anteriores[componente.idCategoria] || 0) + componente.quantidade * item.quantidade;
  }
  const alertas = capacidade.limites.filter((limite) => (capacidade.totais[`${dados.dataEntrega}|${dados.horarioEntrega.slice(0, 2)}|${limite.idCategoria}`] || 0) - (anteriores[limite.idCategoria] || 0) + (totais[limite.idCategoria] || 0) > limite.limite);
  const subtotalResumo = dados.itens.reduce((soma, item) => {
    const cadastro = catalogo[item.tipo === "PRODUTO" ? "produtos" : "combos"].find((c) => c.id === item.idCadastro);
    const anterior = pedido?.fotografia?.itens.find((i) => i.chaveItem === item.chaveItem);
    const multiplo = cadastro?.multiploMinimo || anterior?.multiploMinimo || 1;
    if (!Number.isSafeInteger(item.quantidade) || item.quantidade % multiplo !== 0) return soma;
    const [inteiro, fracao = ""] = String(cadastro?.preco || "0").split(".");
    const preco = cadastro ? BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0")) : BigInt(anterior?.precoPacoteCentavos || 0);
    return soma + preco * BigInt(item.quantidade / multiplo);
  }, 0n);
  const clienteSelecionado = catalogo.clientes.find((c) => c.idCliente === dados.idCliente) || pedido?.fotografia?.cliente;
  const podeContinuar = etapa === 0 ? Boolean(dados.idCliente) : etapa === 1 ? dados.itens.length > 0 : Boolean(dados.dataEntrega && dados.horarioEntrega);
  async function cadastrarCliente() {
    setSalvando(true); setErro("");
    try {
      const cliente = await criarCliente(novoCliente, tokenInterno);
      setCatalogo((atual) => ({ ...atual, clientes: [...atual.clientes, cliente] }));
      alterar("idCliente", cliente.idCliente);
      alterar("endereco", vazio().endereco);
      setAbaCliente("existente"); setEtapa(1);
    } catch (falha) { if (falha.status === 401) await fazerLogout(); setErro(falha.message); }
    finally { setSalvando(false); }
  }
  const conteudoCliente = <div><div className="mb-5 flex gap-3">{[["existente", "Cliente Existente"], ["novo", "Novo Cliente"]].filter(([tipo]) => tipo === "existente" || acesso?.perfilAcesso === "GERENTE" || acesso?.permissoes.includes("CLIENTES")).map(([tipo, nome]) => <button type="button" key={tipo} onClick={() => setAbaCliente(tipo)} className={`flex-1 rounded-xl py-3 text-sm font-semibold ${abaCliente === tipo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{nome}</button>)}</div>{abaCliente === "existente" ? <><div className="relative mb-4"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Pesquisar cliente" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente por nome ou telefone..." className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><div className="space-y-2">{catalogo.clientes.map((c) => <button type="button" key={c.idCliente} onClick={() => escolherCliente(c.idCliente)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${dados.idCliente === c.idCliente ? "border-blue-300 bg-blue-50" : "border-transparent bg-slate-50 hover:bg-slate-100"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">{c.nome.charAt(0)}</span><span><span className="block text-sm font-semibold text-slate-900">{c.nome}</span><span className="block text-xs text-slate-400">{c.telefone}</span></span></button>)}</div></> : <div className="space-y-4"><label className="block text-sm font-medium text-slate-700">Nome<input className={campo} value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}/></label><label className="block text-sm font-medium text-slate-700">Telefone<input className={campo} value={novoCliente.telefone} onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}/></label><button type="button" disabled={!novoCliente.nome.trim() || !novoCliente.telefone.trim()} onClick={cadastrarCliente} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50">Criar Cliente e Continuar</button></div>}</div>;
  const conteudoItens = (<div className="space-y-2">{dados.itens.map((item) => { const cadastro = catalogo[item.tipo === "PRODUTO" ? "produtos" : "combos"].find((c) => c.id === item.idCadastro); const historico = pedido?.fotografia?.itens.find((i) => i.chaveItem === item.chaveItem); return <div key={item.chaveItem} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-center gap-3"><strong className="flex-1 text-sm text-slate-800">{cadastro?.nome || historico?.nome || "Item indisponível"}</strong><label>Unidades<input aria-label={`Quantidade de ${cadastro?.nome || historico?.nome}`} className="ml-2 w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm" type="number" min={cadastro?.multiploMinimo || 1} step={cadastro?.multiploMinimo || 1} value={item.quantidade} onChange={(e) => alterar("itens", dados.itens.map((i) => i === item ? { ...i, quantidade: Number(e.target.value) } : i))} /></label><button type="button" aria-label="Remover item" onClick={() => alterar("itens", dados.itens.filter((i) => i !== item))}><Trash2 size={18} /></button></div><details className="mt-2 text-xs text-slate-400"><summary>Observações e foto</summary><label>Observações do item<input className={campo} value={item.observacoes} onChange={(e) => alterar("itens", dados.itens.map((i) => i === item ? { ...i, observacoes: e.target.value } : i))} /></label><label className="mt-2 block">Foto de referência<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => enviarFoto(item, e.target.files[0])} /></label>{item.foto && <button type="button" onClick={() => alterar("itens", dados.itens.map((i) => i === item ? { ...i, foto: null } : i))}>Foto enviada · remover</button>}</details></div>; })}</div>);
  const conteudoEntrega = (<div className="space-y-5">      <div className="grid grid-cols-3 gap-3">{[["RETIRADA", "Retirada"], ["ENTREGA", "Entrega"], ["CONSUMO_LOCAL", "Consumo local"]].map(([tipo, nome]) => <button type="button" key={tipo} onClick={() => alterar("tipoEntrega", tipo)} className={`rounded-xl py-3 text-sm font-semibold ${dados.tipoEntrega === tipo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{nome}</button>)}</div><div className="grid grid-cols-2 gap-4"><label>Data<input required type="date" className={campo} value={dados.dataEntrega} onChange={(e) => alterar("dataEntrega", e.target.value)} /></label><label>Horário<select required className={campo} value={dados.horarioEntrega} onChange={(e) => alterar("horarioEntrega", e.target.value)}><option value="">Selecione</option>{dados.horarioEntrega && !horarios.includes(dados.horarioEntrega) && <option>{dados.horarioEntrega}</option>}{horarios.map((h) => <option key={h}>{h}</option>)}</select></label></div>
      {!capacidade.expediente.length && <p role="alert">O gerente precisa configurar o expediente antes do primeiro pedido.</p>}
      {alertas.length > 0 && <p className="rounded-lg bg-amber-50 p-3">Aviso: capacidade da faixa horária excedida nas categorias {alertas.map((a) => a.idCategoria).join(", ")}. É permitido continuar.</p>}
      {dados.tipoEntrega === "ENTREGA" && <div className="grid gap-3 sm:grid-cols-2">{Object.entries(camposEndereco).map(([nome, rotulo]) => <label key={nome}>{rotulo}<input className={campo} required={dados.tipoEntrega === "ENTREGA" && ["rua", "numero", "bairro", "cidade"].includes(nome)} value={dados.endereco[nome]} onChange={(e) => alterar("endereco", { ...dados.endereco, [nome]: e.target.value })} /></label>)}</div>}
      <label className="block">Comanda<input className={campo} value={dados.codigoComanda} onChange={(e) => alterar("codigoComanda", e.target.value)} /></label><label className="block">Observações<textarea className={campo} value={dados.observacoes} onChange={(e) => alterar("observacoes", e.target.value)} /></label><label className="block">Personalização<textarea className={campo} value={dados.detalhesPersonalizacao} onChange={(e) => alterar("detalhesPersonalizacao", e.target.value)} /></label></div>);
  const conteudoPagamento = (<div className="space-y-5">      <div className="grid gap-3 sm:grid-cols-3"><label>Desconto (%)<input className={campo} type="number" min="0" max="99.99" step="0.01" value={dados.desconto.percentual} onChange={(e) => alterar("desconto", { ...dados.desconto, percentual: e.target.value })} /></label><label>Desconto fixo (R$)<input className={campo} type="number" min="0" step="0.01" value={dados.desconto.valorFixo} onChange={(e) => alterar("desconto", { ...dados.desconto, valorFixo: e.target.value })} /></label><label>Ordem<select className={campo} value={dados.desconto.ordem} onChange={(e) => alterar("desconto", { ...dados.desconto, ordem: e.target.value })}><option value="PERCENTUAL_PRIMEIRO">Percentual antes do fixo</option><option value="FIXO_PRIMEIRO">Fixo antes do percentual</option></select></label></div>
      <label className="block">Motivo do desconto<input className={campo} value={dados.desconto.motivo} onChange={(e) => alterar("desconto", { ...dados.desconto, motivo: e.target.value })} /></label>
      {!pedido && acesso?.perfilAcesso !== "GERENTE" && <details><summary>Autorizar desconto acima do limite</summary><p>O gerente autoriza esta versão com a própria conta.</p><input className={campo} type="email" placeholder="E-mail do gerente" autoComplete="off" value={gerente.email} onChange={(e) => setGerente({ ...gerente, email: e.target.value })} /><input className={campo} type="password" placeholder="Senha do gerente" autoComplete="off" value={gerente.senha} onChange={(e) => setGerente({ ...gerente, senha: e.target.value })} /></details>}<p className="text-xs text-slate-400">Pagamentos e estornos são registrados nos detalhes após salvar. A situação financeira é calculada pelos lançamentos.</p></div>);
  const conteudoProdutos = <div><div className="mb-5 flex gap-3">{[["PRODUTO", "Produtos"], ["COMBO", "Combos"]].map(([tipo, nome]) => <button type="button" key={tipo} onClick={() => setAbaProduto(tipo)} className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${abaProduto === tipo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{nome}</button>)}</div><div className="relative mb-4"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Buscar produto ou combo" placeholder="Buscar produto ou combo..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{catalogo[abaProduto === "PRODUTO" ? "produtos" : "combos"].filter((c) => c.nome.toLowerCase().includes(buscaProduto.toLowerCase())).map((c) => <button type="button" key={c.id} onClick={() => adicionar(abaProduto, c.id)} className="rounded-xl bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"><Package size={18} className="mb-2 text-slate-400"/><div className="text-sm font-semibold text-slate-900">{c.nome}</div><div className="mt-1 text-xs text-slate-400">R$ {c.preco} / {c.multiploMinimo || 1} {abaProduto === "COMBO" ? "combo" : "unidades"}</div></button>)}</div></div>;
  const avisos = <>{carregando && <p role="status" className="text-sm text-slate-400">Carregando clientes e catálogo…</p>}{erro && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{erro}</p>}{mensagem && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600">{mensagem}</p>}</>;
  const confirmar = <>{previa && <div role="status" className="space-y-2 border-t border-slate-100 py-4 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatarCentavos(previa.fotografia.subtotalCentavos)}</span></div><div className="flex justify-between text-slate-500"><span>Desconto</span><span>{formatarCentavos(previa.fotografia.descontoCentavos)}</span></div><div className="flex justify-between font-bold text-slate-900"><span>Total</span><span className="text-blue-600">{previa.fotografia.totalCentavos ? formatarCentavos(previa.fotografia.totalCentavos) : "Aguardando correção"}</span></div>{previa.impedimentos.map((item, indice) => <p key={indice} className="text-amber-600">{item.mensagem}</p>)}</div>}<button type="submit" className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">{salvando ? "Validando…" : previa ? "Confirmar e salvar pedido" : "Revisar valores"}</button></>;
  if (pedido) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"><section role="dialog" aria-modal="true" aria-label="Editar pedido" className="w-full max-w-md rounded-2xl bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-xl font-bold text-slate-900">{reabrindo ? "Reabrir Pedido" : "Editar Pedido"}</h2><p className="text-sm text-slate-400">{clienteSelecionado?.nome}</p></div><button onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X size={20}/></button></header><form onSubmit={salvar}><fieldset disabled={salvando || carregando || Boolean(mensagem)} className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5 text-sm text-slate-700">{avisos}<h3 className="font-medium">Itens do Pedido</h3><select aria-label="Adicionar produto ou combo" className={campo} value="" onChange={(e) => { const [tipo, id] = e.target.value.split(":"); if (id) adicionar(tipo, id); }}><option value="">Adicionar produto ou combo...</option>{[...catalogo.produtos.map((c) => ({ ...c, tipo: "PRODUTO" })), ...catalogo.combos.map((c) => ({ ...c, tipo: "COMBO" }))].map((c) => <option key={`${c.tipo}:${c.id}`} value={`${c.tipo}:${c.id}`}>{c.nome}</option>)}</select>{conteudoItens}<details><summary>Alterar cliente</summary>{conteudoCliente}</details>{conteudoEntrega}{conteudoPagamento}{confirmar}</fieldset></form><footer className="px-6 pb-6 pt-2"><button onClick={onClose} className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">{mensagem ? "Concluir" : "Cancelar"}</button></footer></section></div>;
  return <div className="px-6 py-8"><form onSubmit={salvar}><fieldset disabled={salvando || carregando || Boolean(mensagem)} className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-slate-100 bg-white shadow-sm"><header className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><ShoppingCart size={20} className="text-blue-600"/></div><div><h1 className="text-lg font-bold text-slate-900">Novo Pedido</h1><p className="text-sm text-slate-400">Passo {etapa + 1} de 4 — {etapas[etapa]}</p></div></div><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X size={20}/></button></header><div className="flex gap-2 px-6 pt-5">{etapas.map((nome, i) => <button type="button" key={nome} onClick={() => i < etapa && setEtapa(i)} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ${i === etapa ? "bg-blue-600 text-white" : i < etapa ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{nome}</button>)}</div><div className="space-y-5 px-6 py-6 text-sm text-slate-700">{avisos}{etapa === 0 && conteudoCliente}{etapa === 1 && conteudoProdutos}{etapa === 2 && conteudoEntrega}{etapa === 3 && conteudoPagamento}</div><footer className="flex gap-3 border-t border-slate-100 px-6 py-5">{etapa > 0 && <button type="button" onClick={() => setEtapa(etapa - 1)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Voltar</button>}{etapa < 3 && <button type="button" disabled={!podeContinuar} onClick={(e) => { if (e.currentTarget.form.reportValidity()) setEtapa(etapa + 1); }} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Continuar</button>}</footer></section><aside className="h-fit rounded-2xl border border-slate-100 bg-white shadow-sm"><header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><ShoppingCart size={16} className="text-blue-600"/><h2 className="text-sm font-bold text-slate-900">Resumo do Pedido</h2></header><div className="space-y-4 px-5 py-4"><div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3"><User size={18} className="text-blue-600"/><div><p className="text-sm font-semibold text-slate-900">{clienteSelecionado?.nome || "Selecione um cliente"}</p><p className="text-xs text-slate-400">{clienteSelecionado?.telefone}</p></div></div>{dados.itens.length ? conteudoItens : <p className="py-8 text-center text-sm text-slate-400">Nenhum item adicionado</p>}{dados.horarioEntrega && <p className="text-xs text-slate-500">{dados.dataEntrega} · {dados.horarioEntrega}</p>}{!previa && <div className="flex justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-slate-900"><span>Subtotal</span><span className="text-blue-600">{formatarCentavos(subtotalResumo)}</span></div>}{etapa === 3 && confirmar}</div></aside></fieldset></form>{mensagem && <div className="mx-auto mt-4 max-w-6xl text-right"><button onClick={onClose} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white">Concluir</button></div>}</div>;
}
