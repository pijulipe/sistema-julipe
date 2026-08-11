import React from "react";
import { Image as ImageIcon, X } from "lucide-react";

/* ---------------------------------------------------------
   Componentes compartilhados para a foto de referência que o
   cliente manda junto do pedido (ex: "quero o bolo assim").
   Cada item do carrinho/pedido pode ter sua própria foto,
   guardada em `item.imagemReferencia` (data URL).
--------------------------------------------------------- */

/** Botão de miniatura clicável — abre o lightbox ao clicar. */
export function MiniaturaImagemReferencia({ src, alt, size = 32, onOpen }) {
  if (!src) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen({ src, alt })}
      className="shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 transition-opacity hover:opacity-80"
      style={{ width: size, height: size }}
      aria-label={`Ver foto de referência${alt ? ` — ${alt}` : ""}`}
      title="Ver foto de referência"
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
    </button>
  );
}

/** Campo para anexar/trocar/remover a foto de um item (usado nos modais de pedido). */
export function CampoImagemReferencia({ item, size = 32, onOpen, onChange, onRemove }) {
  if (item.imagemReferencia) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <MiniaturaImagemReferencia
          src={item.imagemReferencia}
          alt={item.nome}
          size={size}
          onOpen={onOpen}
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-300 transition-colors hover:text-red-500"
          aria-label={`Remover foto de referência de ${item.nome}`}
          title="Remover foto"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <label
      className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 transition-colors hover:border-blue-300 hover:text-blue-500"
      style={{ width: size, height: size }}
      title="Anexar foto de referência (ex: cliente mandou uma foto do bolo desejado)"
    >
      <ImageIcon size={14} />
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  );
}

/** Badge compacto — mostra quantas fotos de referência o pedido tem; clique abre o lightbox (a primeira imagem). */
export function FotosReferenciaBadge({ images, onOpen }) {
  if (!images || images.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(images[0])}
      className="flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-100"
      title="Ver foto(s) de referência do cliente"
    >
      <ImageIcon size={12} />
      {images.length > 1 ? images.length : ""}
    </button>
  );
}

/** Extrai as imagens de referência de um pedido: [{ src, alt }] */
export function obterImagensReferenciaPedido(pedido) {
  return (pedido.itens || [])
    .filter((i) => i.imagemReferencia)
    .map((i) => ({ src: i.imagemReferencia, alt: i.nome }));
}

/** Overlay de tela cheia mostrando a imagem selecionada. */
export function LightboxReferencia({ imagem, onClose }) {
  if (!imagem) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-slate-900/70 px-4"
      onClick={onClose}
    >
      {imagem.alt && (
        <span className="text-sm font-medium text-white">{imagem.alt}</span>
      )}
      <img
        src={imagem.src}
        alt=""
        className="max-h-[80vh] max-w-full rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        className="mt-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        Fechar
      </button>
    </div>
  );
}
