import React, { useEffect, useMemo, useState } from "react";
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
import { useOrders } from "./OrdersContext";
import { useProducts } from "./ProductsContext";
import { useCombos } from "./CombosContext";
import { useClients } from "./ClientsContext";
import { useSettings } from "./SettingsContext";
import { useStock } from "./StockContext";
import { formatPhoneBR } from "./formatters";
import {
  decomposeOrderItems,
  sumByCategory,
  getExceededCategories,
  decomposeItemsByProduct,
  sumByProduct,
} from "./capacity";
import {
  ReferenceImageField,
  ReferenceLightbox,
} from "./ReferencePhotos";

/* ---------------------------------------------------------
   Helpers/constantes
--------------------------------------------------------- */
const STEPS = ["Cliente", "Produtos", "Entrega", "Pagamento"];

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
  const { orders, addOrder } = useOrders();
  const { products } = useProducts();
  const { combos } = useCombos();
  const { clients, addClient, updateClient, findClientByPhone } = useClients();
  const { getSlotsForDate, alertThresholds, autoDeductStock } = useSettings();
  const { getStock, removeQuantity } = useStock();
  const [step, setStep] = useState(0); // 0 Cliente, 1 Produtos, 2 Entrega, 3 Pagamento
  const [lightboxImage, setLightboxImage] = useState(null);

  // ---- Cliente ----
  const [clientTab, setClientTab] = useState("existente"); // existente | novo
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [newClientError, setNewClientError] = useState("");

  // ---- Produtos ----
  const [productTab, setProductTab] = useState("produtos"); // produtos | combos
  const [productSearch, setProductSearch] = useState("");
  const [cartItems, setCartItems] = useState([]); // {id, name, price, qty}

  // ---- Entrega ----
  const [deliveryDate, setDeliveryDate] = useState(todayISO());
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryType, setDeliveryType] = useState("entrega"); // entrega | retirada
  const [notes, setNotes] = useState("");
  // Endereço de entrega deste pedido — só é pedido/exigido quando
  // deliveryType === "entrega" (retirada no local não precisa de endereço).
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");

  // ---- Pagamento ----
  const [paymentMethod, setPaymentMethod] = useState("pix"); // pix | dinheiro | cartao | outro
  const [paymentStatus, setPaymentStatus] = useState("pendente"); // pendente | parcial | pago
  const [discountPercent, setDiscountPercent] = useState(0);

  // Ao escolher (ou trocar) o cliente, pré-preenche o endereço de entrega
  // com o que já está no cadastro dele — mas continua editável, já que o
  // endereço desta entrega específica pode ser diferente do cadastro.
  useEffect(() => {
    if (!selectedClient) return;
    setDeliveryAddress(selectedClient.address || "");
    setDeliveryNumber(selectedClient.number || "");
    setDeliveryNeighborhood(selectedClient.neighborhood || "");
    setDeliveryReference(selectedClient.reference || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.id]);

  /* ---------------- derived values ---------------- */
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [clients, clientSearch]);

  // Quantidade de cada produto já comprometida em pedidos existentes, mas
  // que AINDA NÃO foi fisicamente descontada do estoque (inclui itens
  // vindos de combos, decompostos produto a produto).
  //
  // Importante: usamos a flag `stockDeducted` GRAVADA em cada pedido no
  // momento em que ele foi criado — não o estado atual do interruptor
  // `autoDeductStock`. Um pedido feito com a baixa automática ligada já
  // teve seu estoque físico reduzido (via removeQuantity) na hora; se
  // depois o interruptor for desligado, esse pedido não deve voltar a
  // "reservar" estoque de novo, senão o desconto conta em dobro para sempre.
  const reservedByProduct = useMemo(
    () =>
      sumByProduct(
        decomposeItemsByProduct(
          orders.filter((o) => !o.stockDeducted).flatMap((o) => o.items),
          combos
        )
      ),
    [orders, combos]
  );

  // Quantidade de cada produto presente no carrinho atual (ainda não salvo).
  const cartByProduct = useMemo(
    () => sumByProduct(decomposeItemsByProduct(cartItems, combos)),
    [cartItems, combos]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const base = q
      ? products.filter((p) => p.name.toLowerCase().includes(q))
      : products;
    return base.map((p) => {
      const { quantity } = getStock(p.id);
      // reservedByProduct já exclui pedidos cujo estoque já foi
      // fisicamente descontado — não depende do interruptor atual.
      const remaining = quantity - (reservedByProduct[p.id] || 0);
      return { ...p, stockRemaining: remaining };
    });
  }, [products, productSearch, getStock, reservedByProduct]);

  const productName = (id) =>
    products.find((p) => p.id === id)?.name || "Produto removido";

  const combosWithLabel = useMemo(
    () =>
      combos.map((c) => ({
        ...c,
        itemsLabel: c.items
          .map((i) => `${i.qty}x ${productName(i.productId)}`)
          .join(", "),
      })),
    [combos, products]
  );

  const filteredCombos = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return combosWithLabel;
    return combosWithLabel.filter((c) => c.name.toLowerCase().includes(q));
  }, [combosWithLabel, productSearch]);

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountValue = (subtotal * (Number(discountPercent) || 0)) / 100;
  const total = Math.max(subtotal - discountValue, 0);

  // Horários agendáveis (a cada 15 min) para a data escolhida, conforme o
  // horário de funcionamento configurado. Se o dia estiver fechado, a
  // lista vem vazia.
  const daySlots = useMemo(
    () => getSlotsForDate(deliveryDate),
    [getSlotsForDate, deliveryDate]
  );

  // Se a data mudar e o horário selecionado não existir mais nos slots do
  // novo dia, limpa a seleção para forçar escolher um horário válido.
  useEffect(() => {
    if (deliveryTime && !daySlots.includes(deliveryTime)) {
      setDeliveryTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySlots]);

  /* ---------------- alerta de estoque ---------------- */
  // Compara o que falta comprometer com o estoque disponível de cada
  // produto (inclusive dentro de combos).
  // "esgotado": este pedido usa exatamente o que resta.
  // "insuficiente": este pedido pede mais do que existe em estoque.
  //
  // reservedByProduct já representa apenas os pedidos cujo estoque ainda
  // não foi fisicamente descontado (ver comentário acima) — então basta
  // somar o carrinho atual a isso, sem depender do interruptor atual.
  const stockAlerts = useMemo(() => {
    const alerts = [];
    Object.entries(cartByProduct).forEach(([productIdStr, cartQty]) => {
      const productId = Number(productIdStr);
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const { quantity: available } = getStock(productId);
      const committed = (reservedByProduct[productId] || 0) + cartQty;
      if (committed > available) {
        alerts.push({
          productId,
          name: product.name,
          available,
          level: "insuficiente",
        });
      } else if (available > 0 && committed === available) {
        alerts.push({
          productId,
          name: product.name,
          available,
          level: "esgotado",
        });
      }
    });
    return alerts;
  }, [cartByProduct, reservedByProduct, products, getStock]);

  const hasInsufficientStock = stockAlerts.some(
    (a) => a.level === "insuficiente"
  );

  /* ---------------- alerta de capacidade ---------------- */
  // Combina os pedidos já existentes na mesma data/hora com os itens do
  // carrinho atual (que ainda não foi salvo) para saber se, ao confirmar
  // este pedido, algum limite de categoria seria estourado.
  const capacityAlerts = useMemo(() => {
    if (!deliveryTime) return [];
    const hourBucket = deliveryTime.slice(0, 2);
    const existingItems = orders
      .filter(
        (o) =>
          o.deliveryDate === deliveryDate &&
          (o.deliveryTime || "").slice(0, 2) === hourBucket &&
          o.status !== "entregue"
      )
      .flatMap((o) => o.items);
    const totals = sumByCategory(
      decomposeOrderItems([...existingItems, ...cartItems], products, combos)
    );
    return getExceededCategories(totals, alertThresholds);
  }, [orders, cartItems, products, combos, deliveryDate, deliveryTime, alertThresholds]);

  /* ---------------- actions ---------------- */
  const addItem = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, qty) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))
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
          i.id === id ? { ...i, referenceImage: reader.result } : i
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeItemImage = (id) => {
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, referenceImage: null } : i))
    );
  };

  const createClientAndContinue = () => {
    if (!newClient.name.trim() || !newClient.phone.trim()) return;

    const duplicate = findClientByPhone(newClient.phone);
    if (duplicate) {
      setNewClientError(
        `Já existe um cliente cadastrado com esse telefone: ${duplicate.name}. Use a aba "Cliente Existente" para selecioná-lo.`
      );
      return;
    }

    const created = addClient({
      name: newClient.name.trim(),
      phone: newClient.phone.trim(),
    });
    setSelectedClient(created);
    setStep(1);
  };

  /* ---------------- step validation ---------------- */
  const canAdvance = () => {
    if (step === 0) return !!selectedClient;
    if (step === 1) return cartItems.length > 0;
    if (step === 2)
      return (
        !!deliveryTime &&
        (deliveryType === "retirada" || !!deliveryAddress.trim())
      );
    return true;
  };

  const helperText = () => {
    if (step === 0) return selectedClient ? "" : "Selecione um cliente para continuar";
    if (step === 1) {
      if (!cartItems.length) return "Adicione ao menos 1 item";
      if (hasInsufficientStock)
        return "Atenção: não há estoque suficiente para um ou mais itens — o pedido pode ser feito mesmo assim";
      return "";
    }
    if (step === 2) {
      if (daySlots.length === 0)
        return "Estabelecimento fechado nesta data — escolha outra data";
      if (!deliveryTime) return "Selecione um horário";
      if (deliveryType === "entrega" && !deliveryAddress.trim())
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

  const finalizePedido = () => {
    if (cartItems.length === 0) return;

    // Baixa automática de estoque: desconta a quantidade de cada produto
    // do pedido (decompondo combos nos produtos que os compõem). Permite
    // ficar negativo — o déficit é o que alimenta o alerta na página inicial.
    if (autoDeductStock) {
      decomposeItemsByProduct(cartItems, combos).forEach(({ productId, qty }) => {
        removeQuantity(productId, qty, true);
      });
    }

    const address =
      deliveryType === "retirada"
        ? "Retirada no local"
        : deliveryAddress.trim()
        ? `${deliveryAddress.trim()}${
            deliveryNumber.trim() ? `, ${deliveryNumber.trim()}` : ""
          }`
        : "Endereço não informado";

    // Se for entrega e o endereço foi preenchido, salva (ou atualiza) o
    // endereço no cadastro do cliente — assim, da próxima vez que um
    // pedido for criado para ele, o endereço já vem pré-preenchido
    // automaticamente (ver o useEffect que observa selectedClient acima),
    // sem precisar digitar tudo de novo.
    if (deliveryType === "entrega" && selectedClient && deliveryAddress.trim()) {
      updateClient(selectedClient.id, {
        address: deliveryAddress.trim(),
        number: deliveryNumber.trim(),
        neighborhood: deliveryNeighborhood.trim(),
        reference: deliveryReference.trim(),
      });
    }

    addOrder({
      client: selectedClient,
      items: cartItems,
      deliveryDate,
      deliveryTime,
      deliveryType,
      notes,
      paymentMethod,
      paymentStatus,
      discountPercent: Number(discountPercent) || 0,
      discountValue,
      subtotal,
      total,
      address,
      // Guardados no próprio pedido (podem diferir do cadastro do
      // cliente para esta entrega específica). Vazios em pedidos de
      // retirada, já que não se aplicam.
      neighborhood: deliveryType === "entrega" ? deliveryNeighborhood.trim() : "",
      reference: deliveryType === "entrega" ? deliveryReference.trim() : "",
      // Grava o que aconteceu de fato com o estoque NESTE pedido,
      // independente do que o interruptor vier a ser depois.
      stockDeducted: autoDeductStock,
    });

    onClose();
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
                clientTab={clientTab}
                setClientTab={setClientTab}
                clientSearch={clientSearch}
                setClientSearch={setClientSearch}
                filteredClients={filteredClients}
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                newClient={newClient}
                setNewClient={setNewClient}
                createClientAndContinue={createClientAndContinue}
                newClientError={newClientError}
                setNewClientError={setNewClientError}
              />
            )}

            {step === 1 && (
              <ProdutosStep
                productTab={productTab}
                setProductTab={setProductTab}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                filteredProducts={filteredProducts}
                filteredCombos={filteredCombos}
                addItem={addItem}
              />
            )}

            {step === 2 && (
              <EntregaStep
                deliveryDate={deliveryDate}
                setDeliveryDate={setDeliveryDate}
                deliveryTime={deliveryTime}
                setDeliveryTime={setDeliveryTime}
                deliveryType={deliveryType}
                setDeliveryType={setDeliveryType}
                notes={notes}
                setNotes={setNotes}
                daySlots={daySlots}
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
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                paymentStatus={paymentStatus}
                setPaymentStatus={setPaymentStatus}
                discountPercent={discountPercent}
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
            {selectedClient ? (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                    <User size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedClient.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedClient.phone}
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
            {step >= 2 && deliveryTime && (
              <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> {toBRDate(deliveryDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {deliveryTime}
                </span>
                <span className="ml-auto capitalize">{deliveryType}</span>
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
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatBRL(item.price)}
                      </div>
                    </div>
                    <ReferenceImageField
                      item={item}
                      size={28}
                      onOpen={setLightboxImage}
                      onChange={handleItemImageChange(item.id)}
                      onRemove={() => removeItemImage(item.id)}
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        updateQty(item.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm"
                    />
                    <span className="w-20 text-right text-sm font-semibold text-slate-800">
                      {formatBRL(item.price * item.qty)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-500"
                      aria-label={`Remover ${item.name}`}
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
              {Number(discountPercent) > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Desconto ({Number(discountPercent)}%)</span>
                  <span>-{formatBRL(discountValue)}</span>
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
                    hasInsufficientStock
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
                  {hasInsufficientStock && <span aria-hidden="true">⚠️</span>}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={finalizePedido}
                  disabled={!selectedClient || cartItems.length === 0}
                  title={
                    hasInsufficientStock
                      ? "Atenção: estoque insuficiente para um ou mais itens deste pedido"
                      : undefined
                  }
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
                    selectedClient && cartItems.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "cursor-not-allowed bg-emerald-300"
                  }`}
                >
                  <CheckCircle2 size={16} /> Finalizar Pedido
                  {hasInsufficientStock && <span aria-hidden="true">⚠️</span>}
                </button>
              )}
            </div>

            {helperText() && (
              <p className="mt-2 text-center text-xs text-slate-400">
                {helperText()}
              </p>
            )}
          </div>
        </div>
      </div>

      <ReferenceLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}

/* ---------------------------------------------------------
   Step 1 — Cliente
--------------------------------------------------------- */
function ClienteStep({
  clientTab,
  setClientTab,
  clientSearch,
  setClientSearch,
  filteredClients,
  selectedClient,
  setSelectedClient,
  newClient,
  setNewClient,
  createClientAndContinue,
  newClientError,
  setNewClientError,
}) {
  return (
    <div>
      <div className="mb-5 flex gap-3">
        <button
          onClick={() => setClientTab("existente")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            clientTab === "existente"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Cliente Existente
        </button>
        <button
          onClick={() => setClientTab("novo")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            clientTab === "novo"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Novo Cliente
        </button>
      </div>

      {clientTab === "existente" ? (
        <div>
          <div className="relative mb-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Buscar cliente por nome ou telefone..."
              className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            {filteredClients.map((c) => {
              const isSelected = selectedClient?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClient(c)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-transparent bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {c.name}
                    </div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </div>
                </button>
              );
            })}
            {filteredClients.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Nenhum cliente encontrado
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {newClientError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {newClientError}
            </div>
          )}

          <Field label="Nome" required>
            <input
              value={newClient.name}
              onChange={(e) => {
                setNewClientError("");
                setNewClient((s) => ({ ...s, name: e.target.value }));
              }}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Telefone" required>
            <input
              value={newClient.phone}
              onChange={(e) => {
                setNewClientError("");
                setNewClient((s) => ({
                  ...s,
                  phone: formatPhoneBR(e.target.value),
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
            onClick={createClientAndContinue}
            disabled={!newClient.name.trim() || !newClient.phone.trim()}
            className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
              newClient.name.trim() && newClient.phone.trim()
                ? "bg-blue-600 hover:bg-blue-700"
                : "cursor-not-allowed bg-blue-300"
            }`}
          >
            Criar Cliente e Continuar
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
  productTab,
  setProductTab,
  productSearch,
  setProductSearch,
  filteredProducts,
  filteredCombos,
  addItem,
}) {
  return (
    <div>
      <div className="mb-5 flex gap-3">
        <button
          onClick={() => setProductTab("produtos")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            productTab === "produtos"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Produtos
        </button>
        <button
          onClick={() => setProductTab("combos")}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            productTab === "combos"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          Combos
        </button>
      </div>

      {productTab === "produtos" ? (
        <div>
          <div className="relative mb-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addItem({ id: p.id, name: p.name, price: p.price })}
                className="rounded-xl bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {p.name}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatBRL(p.price)} / {p.unit?.toLowerCase() || "unidade"}
                </div>
                <div
                  className={`mt-1 text-xs font-medium ${
                    p.stockRemaining <= 0 ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {p.stockRemaining > 0
                    ? `Estoque: ${p.stockRemaining}`
                    : "Sem estoque disponível"}
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-slate-400">
                Nenhum produto encontrado
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCombos.map((combo) => (
            <button
              key={combo.id}
              onClick={() =>
                addItem({
                  id: `combo-${combo.id}`,
                  name: combo.name,
                  price: combo.price,
                })
              }
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {combo.name}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {combo.itemsLabel}
                </div>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {formatBRL(combo.price)}
              </span>
            </button>
          ))}
          {filteredCombos.length === 0 && (
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
  deliveryDate,
  setDeliveryDate,
  deliveryTime,
  setDeliveryTime,
  deliveryType,
  setDeliveryType,
  notes,
  setNotes,
  daySlots,
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
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field label="Horário" icon={Clock}>
        {daySlots.length === 0 ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Estabelecimento fechado nesta data. Escolha outra data ou ajuste o
            horário de funcionamento na página inicial.
          </p>
        ) : (
          <select
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="w-full appearance-none rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecionar horário</option>
            {daySlots.map((h) => (
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
              key={a.category}
              className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Atenção: com este pedido, {a.qty.toLocaleString("pt-BR")} itens
                de <strong>{a.category}</strong> ficariam agendados entre{" "}
                {deliveryTime.slice(0, 2)}:00–{deliveryTime.slice(0, 2)}:59
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
              deliveryType === "entrega"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <MapPin size={16} /> Entrega
          </button>
          <button
            onClick={() => setDeliveryType("retirada")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
              deliveryType === "retirada"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Retirada
          </button>
        </div>
      </div>

      {deliveryType === "entrega" && (
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
          value={notes}
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
  paymentMethod,
  setPaymentMethod,
  paymentStatus,
  setPaymentStatus,
  discountPercent,
  setDiscountPercent,
  subtotal,
}) {
  const discountValue = (subtotal * (Number(discountPercent) || 0)) / 100;
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
                paymentMethod === m.id
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
                paymentStatus === s.id
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
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            className="w-full rounded-xl bg-slate-100 px-4 py-3 pr-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            %
          </span>
        </div>
        {Number(discountPercent) > 0 && (
          <p className="mt-1.5 text-xs text-slate-400">
            Equivale a{" "}
            <span className="font-semibold text-slate-600">
              {formatBRL(discountValue)}
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
