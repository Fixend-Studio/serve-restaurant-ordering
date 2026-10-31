"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loadBasket,
  placeLocalOrder,
  quoteBasket,
  saveBasket,
  type BasketLine,
  type PlacedOrder,
} from "@/lib/guest/orders";

type GuestSessionValue = {
  tableNumber: string;
  ready: boolean;
  lines: BasketLine[];
  count: number;
  subtotal: number;
  addItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  setNote: (itemId: string, note: string) => void;
  commitLine: (itemId: string, quantity: number, note: string) => void;
  placeOrder: (customerNote: string) => PlacedOrder;
};

const GuestSessionContext = createContext<GuestSessionValue | null>(null);

export function GuestSession({
  tableNumber,
  children,
}: {
  tableNumber: string;
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<BasketLine[] | null>(null);

  useEffect(() => {
    setLines(loadBasket(tableNumber));
  }, [tableNumber]);

  useEffect(() => {
    if (lines === null) return;
    saveBasket(tableNumber, lines);
  }, [lines, tableNumber]);

  const value = useMemo<GuestSessionValue>(() => {
    const current = lines ?? [];
    let subtotal = 0;
    try {
      subtotal = current.length ? quoteBasket(current).subtotal : 0;
    } catch {
      subtotal = 0;
    }
    return {
      tableNumber,
      ready: lines !== null,
      lines: current,
      count: current.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      addItem: (itemId) => {
        setLines((prev) => {
          const basket = prev ?? [];
          const existing = basket.find((line) => line.itemId === itemId);
          if (!existing) return [...basket, { itemId, quantity: 1, note: "" }];
          if (existing.quantity >= 99) return basket;
          return basket.map((line) =>
            line.itemId === itemId
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          );
        });
      },
      setQuantity: (itemId, quantity) => {
        setLines((prev) => {
          const basket = prev ?? [];
          if (quantity <= 0) {
            return basket.filter((line) => line.itemId !== itemId);
          }
          return basket.map((line) =>
            line.itemId === itemId
              ? { ...line, quantity: Math.min(99, quantity) }
              : line,
          );
        });
      },
      setNote: (itemId, note) => {
        setLines((prev) =>
          (prev ?? []).map((line) =>
            line.itemId === itemId
              ? { ...line, note: note.slice(0, 240) }
              : line,
          ),
        );
      },
      commitLine: (itemId, quantity, note) => {
        setLines((prev) => {
          const basket = prev ?? [];
          const trimmed = note.trim().slice(0, 240);
          if (quantity <= 0) {
            return basket.filter((line) => line.itemId !== itemId);
          }
          const next = {
            itemId,
            quantity: Math.min(99, Math.max(1, quantity)),
            note: trimmed,
          };
          const exists = basket.some((line) => line.itemId === itemId);
          if (!exists) return [...basket, next];
          return basket.map((line) => (line.itemId === itemId ? next : line));
        });
      },
      placeOrder: (customerNote) => {
        const order = placeLocalOrder(tableNumber, current, customerNote);
        setLines([]);
        return order;
      },
    };
  }, [lines, tableNumber]);

  return (
    <GuestSessionContext.Provider value={value}>
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useGuestSession() {
  const value = useContext(GuestSessionContext);
  if (!value) {
    throw new Error("useGuestSession must be used inside GuestSession");
  }
  return value;
}
