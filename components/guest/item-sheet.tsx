"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { QuantityControl } from "@/components/guest/quantity-control";
import type { BasketLine } from "@/lib/guest/orders";
import type { MenuItem } from "@/lib/demo/menu";
import { formatRupees } from "@/lib/money";

export function ItemSheet({
  item,
  line,
  onClose,
  onCommit,
}: {
  item: MenuItem | null;
  line?: BasketLine;
  onClose: () => void;
  onCommit: (itemId: string, quantity: number, note: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item ? (
        <SheetBody
          key={item.id}
          item={item}
          line={line}
          titleId={titleId}
          onClose={onClose}
          onCommit={onCommit}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function SheetBody({
  item,
  line,
  titleId,
  onClose,
  onCommit,
}: {
  item: MenuItem;
  line?: BasketLine;
  titleId: string;
  onClose: () => void;
  onCommit: (itemId: string, quantity: number, note: string) => void;
}) {
  const reduce = useReducedMotion();
  const [quantity, setQuantity] = useState(line?.quantity ?? 1);
  const [note, setNote] = useState(line?.note ?? "");
  const slide = reduce
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.8 };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const total = item.price * quantity;
  const removing = Boolean(line) && quantity === 0;

  return (
    <div className="fixed inset-0 z-50">
      <motion.button
        type="button"
        aria-label="Close dish"
        className="absolute inset-0 bg-[#241c18]/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.2 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-[0_-16px_50px_rgba(36,28,24,0.18)]"
        initial={{ y: reduce ? 0 : "100%" }}
        animate={{ y: 0 }}
        exit={{ y: reduce ? 0 : "100%" }}
        transition={slide}
      >
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="size-10" aria-hidden="true" />
          <span className="h-1 w-10 rounded-full bg-line" />
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {item.image ? (
            <div className="relative mx-4 mt-2 aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="(min-width: 512px) 480px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="mx-4 mt-2 aspect-[4/3] rounded-2xl bg-[#efe4d6]" />
          )}
          <div className="px-5 pt-5 pb-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="font-serif text-3xl tracking-tight">
                {item.name}
              </h2>
              <p className="pt-1 text-sm tabular-nums">{formatRupees(item.price)}</p>
            </div>
            <p className="mt-3 max-w-prose text-sm leading-6 text-muted">
              {item.description}
            </p>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm">Quantity</p>
              <QuantityControl
                value={quantity}
                min={line ? 0 : 1}
                label={item.name}
                onChange={setQuantity}
              />
            </div>
            <label className="mt-6 block">
              <span className="text-sm">Special instructions</span>
              <textarea
                value={note}
                maxLength={240}
                rows={3}
                onChange={(event) => setNote(event.target.value)}
                placeholder="No onion, extra lemon, sweet or salted"
                className="mt-2 w-full resize-none rounded-2xl bg-[#f6f1e8] px-4 py-3 text-sm leading-6 outline-none ring-1 ring-transparent focus:ring-foreground/15"
              />
              <span className="mt-1 block text-right text-xs text-muted">
                {note.length}/240
              </span>
            </label>
          </div>
        </div>
        <div className="border-t border-line/70 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onCommit(item.id, quantity, note);
              onClose();
            }}
            className="flex h-12 w-full items-center justify-between rounded-full bg-accent px-5 text-accent-foreground motion-safe:active:scale-[0.99]"
          >
            <span>{removing ? "Remove from basket" : line ? "Update basket" : "Add to basket"}</span>
            <span className="tabular-nums">{removing ? "" : formatRupees(total)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
