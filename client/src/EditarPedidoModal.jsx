import React, { useEffect, useMemo, useState } from "react";
import { X, Package, Plus, Trash2, MapPin, CreditCard, Calendar, Clock } from "lucide-react";
import { useProdutos } from "./ProdutosContext";
import { useConfiguracoes } from "./ConfiguracoesContext";
import {
  CampoImagemReferencia,
  LightboxReferencia,
} from "./FotosReferencia";

const formatBRL = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const statusPagamentoOpcoes = [
  { id: "pendente", label: "Pendente" },
  { id: "parcial", label: "Parcial" },
  { id: "pago", label: "Pago" },
];

export default function EditarPedidoModal({ pedido, onClose, onSave }) {
  const { produtos } = useProdutos();
  const { obterHorariosPorData } = useConfiguracoes();

  const [itens, setItems] = useState(() => pedido.itens.map((i) => ({ ...i })));
  const [endereco, setAddress] = useState(pedido.endereco || "");
  const [statusPagamento, setPaymentStatus] = useState(pedido.statusPagamento);
  const [descontoPercentual, setDiscountPercent] = useState(pedido.descontoPercentual || 0);
  const [dataEntrega, setDeliveryDate] = useState(pedido.dataEntrega || "");
  const [horarioEntrega, setDeliveryTime] = useState(pedido.horarioEntrega || "");

  const [idProdutoSelecionado, setIdProdutoSelecionado] = useState("");
  const [imagemLightbox, setLightboxImage] = useState(null);

  const subtotal = itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
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

  const handleAdicionarItem = () => {
    if (!idProdutoSelecionado) return;
    const produto = produtos.find((p) => p.id === Number(idProdutoSelecionado));
    if (!produto) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === produto.id);
      if (existing) {
        return prev.map((i) =>
          i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { id: produto.id, nome: produto.nome, preco: produto.preco, quantidade: 1 }];
    });
    setIdProdutoSelecionado("");
  };

  const handleQtyChange = (id, quantidade) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantidade: Math.max(1, quantidade) } : i))
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Foto de referência do item (ex: cliente mandou "quero o bolo assim").
  const handleItemImageChange = (id) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, imagemReferencia: reader.result } : i
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeItemImage = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, imagemReferencia: null } : i))
    );
  };

  const handleSubmit = () => {
    if (
      itens.length === 0 ||
      !endereco.trim() ||
      !dataEntrega ||
      !horarioEntrega
    )
      return;
    onSave({
      itens,
      endereco: endereco.trim(),
      statusPagamento,
      subtotal,
      descontoPercentual: Number(descontoPercentual) || 0,
      valorDesconto,
      total,
      dataEntrega,
      horarioEntrega,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Editar Pedido</h2>
            <p className="text-sm text-slate-400">{pedido.cliente?.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Itens */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Itens do Pedido
            </label>

            <div className="mb-3 flex items-center gap-2">
              <select
                value={idProdutoSelecionado}
                onChange={(e) => setIdProdutoSelecionado(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Adicionar produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdicionarItem}
                disabled={!idProdutoSelecionado}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Adicionar item"
              >
                <Plus size={18} />
              </button>
            </div>

            {itens.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">
                Nenhum item no pedido
              </p>
            ) : (
              <div className="space-y-2">
                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                  >
                    <Package size={15} className="shrink-0 text-slate-400" />
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
                        handleQtyChange(item.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm"
                    />
                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-slate-800">
                      {formatBRL(item.preco * item.quantidade)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="shrink-0 text-slate-300 hover:text-red-500"
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data e Horário */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar size={15} /> Data
                </label>
                <input
                  type="date"
                  lang="pt-BR"
                  value={dataEntrega}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock size={15} /> Horário
                </label>
                <select
                  value={horarioEntrega}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  disabled={horariosDoDia.length === 0}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecionar</option>
                  {horariosDoDia.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {horariosDoDia.length === 0 && (
              <p className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
                Estabelecimento fechado nesta data. Escolha outra data ou
                ajuste o horário de funcionamento na página inicial.
              </p>
            )}
          </div>

          {/* Endereço */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <MapPin size={15} /> Endereço
            </label>
            <input
              value={endereco}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Endereço de entrega"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status de pagamento */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <CreditCard size={15} /> Status do Pagamento
            </label>
            <div className="grid grid-cols-3 gap-3">
              {statusPagamentoOpcoes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPaymentStatus(s.id)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
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

          {/* Desconto */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Desconto (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={descontoPercentual}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>

          {/* Totais */}
          <div className="space-y-1 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {descontoPercentual > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Desconto ({descontoPercentual}%)</span>
                <span>-{formatBRL(valorDesconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="text-blue-600">{formatBRL(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              itens.length === 0 ||
              !endereco.trim() ||
              !dataEntrega ||
              !horarioEntrega
            }
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>

      <LightboxReferencia
        imagem={imagemLightbox}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
