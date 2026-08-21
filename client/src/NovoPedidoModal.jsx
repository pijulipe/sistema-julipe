import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  X,
  Search,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { usePedidos } from "./PedidosContext";
import { useProdutos } from "./ProdutosContext";
import { useCombos } from "./CombosContext";
import { useClientes } from "./ClientesContext";
import { useConfiguracoes } from "./ConfiguracoesContext";
import { useEstoque } from "./EstoqueContext";
import { formatarTelefoneBR } from "./formatadores";
import {
  decomporItensPedido,
  somarPorCategoria,
  obterCategoriasExcedidas,
  decomporItensPorProduto,
  somarPorProduto,
} from "./capacidade";
import {
  CampoImagemReferencia,
  LightboxReferencia,
} from "./FotosReferencia";

/* ---------------------------------------------------------
   Helpers/constantes
--------------------------------------------------------- */
const STEPS = ["Cliente", "Produtos", "Entrega", "Pagamento"];
// Decisão provisória: alterar para false caso a doceria confirme que o
// endereço informado no pedido não deve atualizar o cadastro do cliente.
const ATUALIZAR_CADASTRO_CLIENTE_COM_ENDERECO_PEDIDO = true;

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatBRL = (value) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const todayISO = () => new Date().toISOString().split("T")[0];
const toBRDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/* ---------------------------------------------------------
   Main component
--------------------------------------------------------- */
export default function NovoPedidoModal({ onClose = () => {} }) {
  const { pedidos, adicionarPedido } = usePedidos();
  const { produtos } = useProdutos();
  const { combos } = useCombos();
  const {
    clientes,
    adicionarCliente,
    atualizarCliente,
    carregarClientes,
    carregandoClientes,
  } = useClientes();
  const { obterHorariosPorData, limitesAlerta, baixaAutomaticaEstoque } = useConfiguracoes();
  const { obterEstoque, removerQuantidade } = useEstoque();
  const [step, setStep] = useState(0); // 0 Cliente, 1 Produtos, 2 Entrega, 3 Pagamento
  const [imagemLightbox, setLightboxImage] = useState(null);

  // ---- Cliente ----
  const [abaCliente, setAbaCliente] = useState("existente"); // existente | novo
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "" });
  const [erroNovoCliente, setNovoClienteError] = useState("");
  const [criandoCliente, setCriandoCliente] = useState(false);
  const carregarClientesRef = useRef(carregarClientes);

  // ---- Produtos ----
  const [abaProduto, setAbaProduto] = useState("produtos"); // produtos | combos
  const [buscaProduto, setBuscaProduto] = useState("");
  const [cartItems, setCartItems] = useState([]); // {id, nome, preco, quantidade}

  // ---- Entrega ----
  const [dataEntrega, setDeliveryDate] = useState(todayISO());
  const [horarioEntrega, setDeliveryTime] = useState("");
  const [tipoEntrega, setDeliveryType] = useState("entrega"); // entrega | retirada
  const [observacoes, setNotes] = useState("");
  // Endereço de entrega deste pedido — só é pedido/exigido quando
  // tipoEntrega === "entrega" (retirada no local não precisa de endereço).
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");

  // ---- Pagamento ----
  const [formaPagamento, setPaymentMethod] = useState("pix"); // pix | dinheiro | cartao | outro
  const [statusPagamento, setPaymentStatus] = useState("pendente"); // pendente | parcial | pago
  const [descontoPercentual, setDiscountPercent] = useState(0);
  const [finalizandoPedido, setFinalizandoPedido] = useState(false);
  const [erroFinalizacao, setErroFinalizacao] = useState("");

  useEffect(() => {
    carregarClientesRef.current = carregarClientes;
  }, [carregarClientes]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      carregarClientesRef.current({
        busca: buscaCliente,
        pagina: 1,
        limite: 20,
      });
    }, 300);

    return () => clearTimeout(temporizador);
  }, [buscaCliente]);

  // Ao escolher (ou trocar) o cliente, pré-preenche o endereço de entrega
  // com o que já está no cadastro dele — mas continua editável, já que o
  // endereço desta entrega específica pode ser diferente do cadastro.
  useEffect(() => {
    if (!clienteSelecionado) return;
    setDeliveryAddress(clienteSelecionado.endereco || "");
    setDeliveryNumber(clienteSelecionado.numeroEndereco || "");
    setDeliveryNeighborhood(clienteSelecionado.bairro || "");
    setDeliveryReference(clienteSelecionado.pontoReferencia || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSelecionado?.idCliente]);

  /* ---------------- derived values ---------------- */
  const clientesFiltrados = clientes;

  // Quantidade de cada produto já comprometida em pedidos existentes, mas
  // que AINDA NÃO foi fisicamente descontada do estoque (inclui itens
  // vindos de combos, decompostos produto a produto).
  //
  // Importante: usamos a flag `estoqueBaixado` GRAVADA em cada pedido no
  // momento em que ele foi criado — não o estado atual do interruptor
  // `baixaAutomaticaEstoque`. Um pedido feito com a baixa automática ligada já
  // teve seu estoque físico reduzido (via removerQuantidade) na hora; se
  // depois o interruptor for desligado, esse pedido não deve voltar a
  // "reservar" estoque de novo, senão o desconto conta em dobro para sempre.
  const reservadoPorProduto = useMemo(
    () =>
      somarPorProduto(
        decomporItensPorProduto(
          pedidos.filter((o) => !o.estoqueBaixado).flatMap((o) => o.itens),
          combos
        )
      ),
    [pedidos, combos]
  );

  // Quantidade de cada produto presente no carrinho atual (ainda não salvo).
  const carrinhoPorProduto = useMemo(
    () => somarPorProduto(decomporItensPorProduto(cartItems, combos)),
    [cartItems, combos]
  );

  const produtosFiltrados = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase();
    const base = q
      ? produtos.filter((p) => p.nome.toLowerCase().includes(q))
      : produtos;
    return base.map((p) => {
      const { quantidade } = obterEstoque(p.id);
      // reservadoPorProduto já exclui pedidos cujo estoque já foi
      // fisicamente descontado — não depende do interruptor atual.
      const remaining = quantidade - (reservadoPorProduto[p.id] || 0);
      return { ...p, estoqueRestante: remaining };
    });
  }, [produtos, buscaProduto, obterEstoque, reservadoPorProduto]);

  const nomeProduto = (id) =>
    produtos.find((p) => p.id === id)?.nome || "Produto removido";

  const combosComRotulo = useMemo(
    () =>
      combos.map((c) => ({
        ...c,
        itemsLabel: c.itens
          .map((i) => `${i.quantidade}x ${nomeProduto(i.idProduto)}`)
          .join(", "),
      })),
    [combos, produtos]
  );

  const combosFiltrados = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase();
    if (!q) return combosComRotulo;
    return combosComRotulo.filter((c) => c.nome.toLowerCase().includes(q));
  }, [combosComRotulo, buscaProduto]);

  const subtotal = cartItems.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
  const valorDesconto = (subtotal * (Number(descontoPercentual) || 0)) / 100;
  const total = Math.max(subtotal - valorDesconto, 0);

  // Horários agendáveis (a cada 15 min) para a data escolhida, conforme o
  // horário de funcionamento configurado. Se o dia estiver fechado, a
  // lista vem vazia.
  const horariosDoDia = useMemo(
    () => obterHorariosPorData(dataEntrega),
    [obterHorariosPorData, dataEntrega]
  );

  // Se a data mudar e o horário selecionado não existir mais nos slots do
  // novo dia, limpa a seleção para forçar escolher um horário válido.
  useEffect(() => {
    if (horarioEntrega && !horariosDoDia.includes(horarioEntrega)) {
      setDeliveryTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horariosDoDia]);

  /* ---------------- alerta de estoque ---------------- */
  // Compara o que falta comprometer com o estoque disponível de cada
  // produto (inclusive dentro de combos).
  // "esgotado": este pedido usa exatamente o que resta.
  // "insuficiente": este pedido pede mais do que existe em estoque.
  //
  // reservadoPorProduto já representa apenas os pedidos cujo estoque ainda
  // não foi fisicamente descontado (ver comentário acima) — então basta
  // somar o carrinho atual a isso, sem depender do interruptor atual.
  const alertasEstoque = useMemo(() => {
    const alerts = [];
    Object.entries(carrinhoPorProduto).forEach(([idProdutoStr, cartQty]) => {
      const idProduto = Number(idProdutoStr);
      const produto = produtos.find((p) => p.id === idProduto);
      if (!produto) return;
      const { quantidade: available } = obterEstoque(idProduto);
      const committed = (reservadoPorProduto[idProduto] || 0) + cartQty;
      if (committed > available) {
        alerts.push({
          idProduto,
          nome: produto.nome,
          available,
          level: "insuficiente",
        });
      } else if (available > 0 && committed === available) {
        alerts.push({
          idProduto,
          nome: produto.nome,
          available,
          level: "esgotado",
        });
      }
    });
    return alerts;
  }, [carrinhoPorProduto, reservadoPorProduto, produtos, obterEstoque]);

  const temEstoqueInsuficiente = alertasEstoque.some(
    (a) => a.level === "insuficiente"
  );

  /* ---------------- alerta de capacidade ---------------- */
  // Combina os pedidos já existentes na mesma data/hora com os itens do
  // carrinho atual (que ainda não foi salvo) para saber se, ao confirmar
  // este pedido, algum limite de categoria seria estourado.
  const capacityAlerts = useMemo(() => {
    if (!horarioEntrega) return [];
    const faixaHora = horarioEntrega.slice(0, 2);
    const existingItems = pedidos
      .filter(
        (o) =>
          o.dataEntrega === dataEntrega &&
          (o.horarioEntrega || "").slice(0, 2) === faixaHora &&
          o.status !== "entregue"
      )
      .flatMap((o) => o.itens);
    const totals = somarPorCategoria(
      decomporItensPedido([...existingItems, ...cartItems], produtos, combos)
    );
    return obterCategoriasExcedidas(totals, limitesAlerta);
  }, [pedidos, cartItems, produtos, combos, dataEntrega, horarioEntrega, limitesAlerta]);

  /* ---------------- actions ---------------- */
  const addItem = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { ...item, quantidade: 1 }];
    });
  };

  const updateQty = (id, quantidade) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantidade: Math.max(1, quantidade) } : i))
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Foto de referência do item (ex: cliente mandou "quero o bolo assim").
  const handleItemImageChange = (id) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCartItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, imagemReferencia: reader.result } : i
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeItemImage = (id) => {
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, imagemReferencia: null } : i))
    );
  };

  const criarClienteEContinuar = async () => {
    if (
      criandoCliente ||
      !novoCliente.nome.trim() ||
      !novoCliente.telefone.trim()
    ) {
      return;
    }

    setNovoClienteError("");
    setCriandoCliente(true);

    try {
      const clienteCriado = await adicionarCliente({
        nome: novoCliente.nome.trim(),
        telefone: novoCliente.telefone.trim(),
      });
      setClienteSelecionado(clienteCriado);
      setStep(1);
    } catch (erro) {
      setNovoClienteError(
        erro?.message || "Não foi possível cadastrar o cliente.",
      );
    } finally {
      setCriandoCliente(false);
    }
  };

  /* ---------------- step validation ---------------- */
  const canAdvance = () => {
    if (step === 0) return !!clienteSelecionado;
    if (step === 1) return cartItems.length > 0;
    if (step === 2)
      return (
        !!horarioEntrega &&
        (tipoEntrega === "retirada" || !!deliveryAddress.trim())
      );
    return true;
  };

  const helperText = () => {
    if (step === 0) return clienteSelecionado ? "" : "Selecione um cliente para continuar";
    if (step === 1) {
      if (!cartItems.length) return "Adicione ao menos 1 item";
      if (temEstoqueInsuficiente)
        return "Atenção: não há estoque suficiente para um ou mais itens — o pedido pode ser feito mesmo assim";
      return "";
    }
    if (step === 2) {
      if (horariosDoDia.length === 0)
        return "Estabelecimento fechado nesta data — escolha outra data";
      if (!horarioEntrega) return "Selecione um horário";
      if (tipoEntrega === "entrega" && !deliveryAddress.trim())
        return "Informe o endereço de entrega";
      return "";
    }
    return "";
  };

  const goNext = () => {
    if (!canAdvance()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const finalizePedido = async () => {
    if (cartItems.length === 0 || finalizandoPedido) return;

    setErroFinalizacao("");
    setFinalizandoPedido(true);
    let clienteDoPedido = clienteSelecionado;

    const endereco =
      tipoEntrega === "retirada"
        ? "Retirada no local"
        : deliveryAddress.trim()
        ? `${deliveryAddress.trim()}${
            deliveryNumber.trim() ? `, ${deliveryNumber.trim()}` : ""
          }`
        : "Endereço não informado";

    try {
      if (
        ATUALIZAR_CADASTRO_CLIENTE_COM_ENDERECO_PEDIDO &&
        tipoEntrega === "entrega" &&
        clienteSelecionado &&
        deliveryAddress.trim()
      ) {
        clienteDoPedido = await atualizarCliente(clienteSelecionado.idCliente, {
          endereco: deliveryAddress.trim(),
          numeroEndereco: deliveryNumber.trim(),
          bairro: deliveryNeighborhood.trim(),
          pontoReferencia: deliveryReference.trim(),
        });
      }

      // A baixa ocorre somente depois que as operações assíncronas que
      // podem impedir a finalização tiverem sido concluídas.
      if (baixaAutomaticaEstoque) {
        decomporItensPorProduto(cartItems, combos).forEach(
          ({ idProduto, quantidade }) => {
            removerQuantidade(idProduto, quantidade, true);
          },
        );
      }

      adicionarPedido({
        cliente: clienteDoPedido,
        itens: cartItems,
        dataEntrega,
        horarioEntrega,
        tipoEntrega,
        observacoes,
        formaPagamento,
        statusPagamento,
        descontoPercentual: Number(descontoPercentual) || 0,
        valorDesconto,
        subtotal,
        total,
        endereco,
        bairro: tipoEntrega === "entrega" ? deliveryNeighborhood.trim() : "",
        reference: tipoEntrega === "entrega" ? deliveryReference.trim() : "",
        estoqueBaixado: baixaAutomaticaEstoque,
      });

      onClose();
    } catch (erro) {
      setErroFinalizacao(
        erro?.message || "Não foi possível finalizar o pedido.",
      );
    } finally {
      setFinalizandoPedido(false);
    }
  };

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */
  return (
    <div className="px-6 py-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ---------------- Left card: steps ---------------- */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ShoppingCart size={20} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Novo Pedido</h1>
                <p className="text-sm text-slate-400">
                  Passo {step + 1} de 4 — {STEPS[step]}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Step tabs */}
          <div className="flex gap-2 px-6 pt-5">
            {STEPS.map((label, i) => {
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={label}
                  onClick={() => i < step && setStep(i)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isDone
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className="px-6 py-6">
            {step === 0 && (
              <ClienteStep
                abaCliente={abaCliente}
                setAbaCliente={setAbaCliente}
                buscaCliente={buscaCliente}
                setBuscaCliente={setBuscaCliente}
                clientesFiltrados={clientesFiltrados}
                clienteSelecionado={clienteSelecionado}
                setClienteSelecionado={setClienteSelecionado}
                novoCliente={novoCliente}
                setNovoCliente={setNovoCliente}
                criarClienteEContinuar={criarClienteEContinuar}
                erroNovoCliente={erroNovoCliente}
                setNovoClienteError={setNovoClienteError}
                criandoCliente={criandoCliente}
                carregandoClientes={carregandoClientes}
              />
            )}

            {step === 1 && (
              <ProdutosStep
                abaProduto={abaProduto}
                setAbaProduto={setAbaProduto}
                buscaProduto={buscaProduto}
                setBuscaProduto={setBuscaProduto}
                produtosFiltrados={produtosFiltrados}
                combosFiltrados={combosFiltrados}
                addItem={addItem}
              />
            )}

            {step === 2 && (
              <EntregaStep
                dataEntrega={dataEntrega}
                setDeliveryDate={setDeliveryDate}
                horarioEntrega={horarioEntrega}
                setDeliveryTime={setDeliveryTime}
                tipoEntrega={tipoEntrega}
                setDeliveryType={setDeliveryType}
                observacoes={observacoes}
                setNotes={setNotes}
                horariosDoDia={horariosDoDia}
                capacityAlerts={capacityAlerts}
                deliveryAddress={deliveryAddress}
                setDeliveryAddress={setDeliveryAddress}
                deliveryNumber={deliveryNumber}
                setDeliveryNumber={setDeliveryNumber}
                deliveryNeighborhood={deliveryNeighborhood}
                setDeliveryNeighborhood={setDeliveryNeighborhood}
                deliveryReference={deliveryReference}
                setDeliveryReference={setDeliveryReference}
              />
            )}

            {step === 3 && (
              <PagamentoStep
                formaPagamento={formaPagamento}
                setPaymentMethod={setPaymentMethod}
                statusPagamento={statusPagamento}
                setPaymentStatus={setPaymentStatus}
                descontoPercentual={descontoPercentual}
                setDiscountPercent={setDiscountPercent}
                subtotal={subtotal}
              />
            )}
          </div>
        </div>

        {/* ---------------- Right card: summary ---------------- */}
        <div className="h-fit rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <ShoppingCart size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Resumo do Pedido</h2>
          </div>

          <div className="px-5 py-4">
            {/* Client block */}
            {clienteSelecionado ? (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                    <User size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {clienteSelecionado.nome}
                    </div>
                    <div className="text-xs text-slate-400">
                      {clienteSelecionado.telefone}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStep(0)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Alterar
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
                  <User size={16} className="text-slate-400" />
                </div>
                <span className="text-sm text-slate-400">
                  Selecione um cliente
                </span>
              </div>
            )}

            {/* Delivery badge row */}
            {step >= 2 && horarioEntrega && (
              <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> {toBRDate(dataEntrega)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {horarioEntrega}
                </span>
                <span className="ml-auto capitalize">{tipoEntrega}</span>
              </div>
            )}

            {/* Items */}
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package size={32} className="mb-2 text-slate-200" strokeWidth={1.5} />
                <p className="text-sm text-slate-400">Nenhum item adicionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {item.nome}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatBRL(item.preco)}
                      </div>
                    </div>
                    <CampoImagemReferencia
                      item={item}
                      size={28}
                      onOpen={setLightboxImage}
                      onChange={handleItemImageChange(item.id)}
                      onRemove={() => removeItemImage(item.id)}
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) =>
                        updateQty(item.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm"
                    />
                    <span className="w-20 text-right text-sm font-semibold text-slate-800">
                      {formatBRL(item.preco * item.quantidade)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-500"
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {step >= 1 && (
                  <button
                    onClick={() => setStep(1)}
                    className="pt-1 text-sm font-medium text-blue-600 hover:underline"
                  >
                    + Adicionar mais itens
                  </button>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {Number(descontoPercentual) > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Desconto ({Number(descontoPercentual)}%)</span>
                  <span>-{formatBRL(valorDesconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span className="text-blue-600">{formatBRL(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              {step > 0 && (
                <button
                  onClick={goBack}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canAdvance()}
                  title={
                    temEstoqueInsuficiente
                      ? "Atenção: estoque insuficiente para um ou mais itens deste pedido"
                      : undefined
                  }
                  className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
                    canAdvance()
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "cursor-not-allowed bg-blue-300"
                  }`}
                >
                  Avançar
                  {temEstoqueInsuficiente && <span aria-hidden="true">⚠️</span>}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={finalizePedido}
                  disabled={
                    !clienteSelecionado ||
                    cartItems.length === 0 ||
                    finalizandoPedido
                  }
                  title={
                    temEstoqueInsuficiente
                      ? "Atenção: estoque insuficiente para um ou mais itens deste pedido"
                      : undefined
                  }
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
                    clienteSelecionado &&
                    cartItems.length > 0 &&
                    !finalizandoPedido
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "cursor-not-allowed bg-emerald-300"
                  }`}
                >
                  <CheckCircle2 size={16} />
                  {finalizandoPedido ? "Finalizando..." : "Finalizar Pedido"}
                  {temEstoqueInsuficiente && <span aria-hidden="true">⚠️</span>}
                </button>
              )}
            </div>

            {helperText() && (
              <p className="mt-2 text-center text-xs text-slate-400">
                {helperText()}
              </p>
            )}
            {erroFinalizacao && (
              <p className="mt-2 text-center text-xs text-red-600">
                {erroFinalizacao}
              </p>
            )}
          </div>
        </div>
      </div>

      <LightboxReferencia
        imagem={imagemLightbox}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}

/* ---------------------------------------------------------
   Step 1 — Cliente
--------------------------------------------------------- */
function ClienteStep({
  abaCliente,
  setAbaCliente,
  buscaCliente,
  setBuscaCliente,
  clientesFiltrados,
  clienteSelecionado,
  setClienteSelecionado,
  novoCliente,
  setNovoCliente,
  criarClienteEContinuar,
  erroNovoCliente,
  setNovoClienteError,
  criandoCliente,
  carregandoClientes,
}) {
  return (
    <div>
      <div className="mb-5 flex gap-3">
        <button
          onClick={() => setAbaCliente("existente")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            abaCliente === "existente"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Cliente Existente
        </button>
        <button
          onClick={() => setAbaCliente("novo")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            abaCliente === "novo"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Novo Cliente
        </button>
      </div>

      {abaCliente === "existente" ? (
        <div>
          <div className="relative mb-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              placeholder="Buscar cliente por nome ou telefone..."
              className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            {clientesFiltrados.map((c) => {
              const isSelected =
                clienteSelecionado?.idCliente === c.idCliente;
              return (
                <button
                  key={c.idCliente}
                  onClick={() => setClienteSelecionado(c)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-transparent bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {c.nome.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {c.nome}
                    </div>
                    <div className="text-xs text-slate-400">{c.telefone}</div>
                  </div>
                </button>
              );
            })}
            {carregandoClientes && (
              <p className="py-6 text-center text-sm text-slate-400">
                Carregando clientes...
              </p>
            )}
            {!carregandoClientes && clientesFiltrados.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Nenhum cliente encontrado
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {erroNovoCliente && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {erroNovoCliente}
            </div>
          )}

          <Field label="Nome" required>
            <input
              value={novoCliente.nome}
              onChange={(e) => {
                setNovoClienteError("");
                setNovoCliente((s) => ({ ...s, nome: e.target.value }));
              }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Telefone" required>
            <input
              value={novoCliente.telefone}
              onChange={(e) => {
                setNovoClienteError("");
                setNovoCliente((s) => ({
                  ...s,
                  telefone: formatarTelefoneBR(e.target.value),
                }));
              }}
              placeholder="(11) 90000-0000"
              inputMode="numeric"
              maxLength={16}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <p className="text-xs text-slate-400">
            O endereço, se este pedido for de entrega, é informado mais
            adiante — na etapa "Entrega".
          </p>

          <button
            onClick={criarClienteEContinuar}
            disabled={
              criandoCliente ||
              !novoCliente.nome.trim() ||
              !novoCliente.telefone.trim()
            }
            className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
              novoCliente.nome.trim() &&
              novoCliente.telefone.trim() &&
              !criandoCliente
                ? "bg-blue-600 hover:bg-blue-700"
                : "cursor-not-allowed bg-blue-300"
            }`}
          >
            {criandoCliente ? "Criando cliente..." : "Criar Cliente e Continuar"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Step 2 — Produtos
--------------------------------------------------------- */
function ProdutosStep({
  abaProduto,
  setAbaProduto,
  buscaProduto,
  setBuscaProduto,
  produtosFiltrados,
  combosFiltrados,
  addItem,
}) {
  return (
    <div>
      <div className="mb-5 flex gap-3">
        <button
          onClick={() => setAbaProduto("produtos")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            abaProduto === "produtos"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Produtos
        </button>
        <button
          onClick={() => setAbaProduto("combos")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            abaProduto === "combos"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Combos
        </button>
      </div>

      {abaProduto === "produtos" ? (
        <div>
          <div className="relative mb-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {produtosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => addItem({ id: p.id, nome: p.nome, preco: p.preco })}
                className="rounded-xl bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {p.nome}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatBRL(p.preco)} / {p.unidade?.toLowerCase() || "unidade"}
                </div>
                <div
                  className={`mt-1 text-xs font-medium ${
                    p.estoqueRestante <= 0 ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {p.estoqueRestante > 0
                    ? `Estoque: ${p.estoqueRestante}`
                    : "Sem estoque disponível"}
                </div>
              </button>
            ))}
            {produtosFiltrados.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-slate-400">
                Nenhum produto encontrado
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {combosFiltrados.map((combo) => (
            <button
              key={combo.id}
              onClick={() =>
                addItem({
                  id: `combo-${combo.id}`,
                  nome: combo.nome,
                  preco: combo.preco,
                })
              }
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {combo.nome}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {combo.itemsLabel}
                </div>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {formatBRL(combo.preco)}
              </span>
            </button>
          ))}
          {combosFiltrados.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhum combo encontrado
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Step 3 — Entrega
--------------------------------------------------------- */
function EntregaStep({
  dataEntrega,
  setDeliveryDate,
  horarioEntrega,
  setDeliveryTime,
  tipoEntrega,
  setDeliveryType,
  observacoes,
  setNotes,
  horariosDoDia,
  capacityAlerts,
  deliveryAddress,
  setDeliveryAddress,
  deliveryNumber,
  setDeliveryNumber,
  deliveryNeighborhood,
  setDeliveryNeighborhood,
  deliveryReference,
  setDeliveryReference,
}) {
  return (
    <div className="space-y-5">
      <Field label="Data" icon={Calendar}>
        <input
          type="date"
          lang="pt-BR"
          value={dataEntrega}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field label="Horário" icon={Clock}>
        {horariosDoDia.length === 0 ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Estabelecimento fechado nesta data. Escolha outra data ou ajuste o
            horário de funcionamento na página inicial.
          </p>
        ) : (
          <select
            value={horarioEntrega}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="w-full appearance-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecionar horário</option>
            {horariosDoDia.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        )}
      </Field>

      {capacityAlerts.length > 0 && (
        <div className="space-y-2">
          {capacityAlerts.map((a) => (
            <div
              key={a.categoria}
              className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Atenção: com este pedido, {a.quantidade.toLocaleString("pt-BR")} itens
                de <strong>{a.categoria}</strong> ficariam agendados entre{" "}
                {horarioEntrega.slice(0, 2)}:00–{horarioEntrega.slice(0, 2)}:59
                (limite: +{a.threshold}).
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Tipo
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setDeliveryType("entrega")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
              tipoEntrega === "entrega"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <MapPin size={16} /> Entrega
          </button>
          <button
            onClick={() => setDeliveryType("retirada")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
              tipoEntrega === "retirada"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Retirada
          </button>
        </div>
      </div>

      {tipoEntrega === "entrega" && (
        <div className="space-y-4 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <MapPin size={15} /> Endereço de Entrega
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-4">
            <Field label="Endereço" required>
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Rua, avenida..."
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Número">
              <input
                value={deliveryNumber}
                onChange={(e) => setDeliveryNumber(e.target.value)}
                placeholder="Nº"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bairro">
              <input
                value={deliveryNeighborhood}
                onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Ponto de Referência">
              <input
                value={deliveryReference}
                onChange={(e) => setDeliveryReference(e.target.value)}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>
        </div>
      )}

      <Field label="Observações">
        <textarea
          value={observacoes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>
    </div>
  );
}

/* ---------------------------------------------------------
   Step 4 — Pagamento
--------------------------------------------------------- */
function PagamentoStep({
  formaPagamento,
  setPaymentMethod,
  statusPagamento,
  setPaymentStatus,
  descontoPercentual,
  setDiscountPercent,
  subtotal,
}) {
  const valorDesconto = (subtotal * (Number(descontoPercentual) || 0)) / 100;
  const methods = [
    { id: "pix", label: "PIX" },
    { id: "dinheiro", label: "Dinheiro" },
    { id: "cartao", label: "Cartão" },
    { id: "outro", label: "Outro" },
  ];
  const statuses = [
    { id: "pendente", label: "Pendente" },
    { id: "parcial", label: "Parcial" },
    { id: "pago", label: "Pago" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <CreditCard size={16} /> Forma de Pagamento
        </label>
        <div className="grid grid-cols-2 gap-3">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              className={`rounded-xl py-3 text-sm font-semibold transition-colors ${
                formaPagamento === m.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Status do Pagamento
        </label>
        <div className="grid grid-cols-3 gap-3">
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => setPaymentStatus(s.id)}
              className={`rounded-xl py-3 text-sm font-semibold transition-colors ${
                statusPagamento === s.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Desconto (%)">
        <div className="relative">
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={descontoPercentual}
            onChange={(e) => setDiscountPercent(e.target.value)}
            className="w-full rounded-xl bg-slate-100 px-4 py-3 pr-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            %
          </span>
        </div>
        {Number(descontoPercentual) > 0 && (
          <p className="mt-1.5 text-xs text-slate-400">
            Equivale a{" "}
            <span className="font-semibold text-slate-600">
              {formatBRL(valorDesconto)}
            </span>{" "}
            de desconto
          </p>
        )}
      </Field>
    </div>
  );
}

/* ---------------------------------------------------------
   Shared bits
--------------------------------------------------------- */
function Field({ label, required, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        {Icon && <Icon size={15} />}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
