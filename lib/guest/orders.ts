import { getItem } from "@/lib/demo/menu";

export type BasketLine = {
  itemId: string;
  quantity: number;
  note: string;
};

export type PlacedLine = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  lineTotal: number;
};

export type PlacedOrder = {
  id: string;
  token: string;
  orderNumber: number;
  tableNumber: string;
  items: PlacedLine[];
  note: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: "unpaid";
  fulfillmentStatus: "pending";
  createdAt: string;
};

const basketKey = (tableNumber: string) => `serve.basket.${tableNumber}`;
const orderKey = (orderId: string) => `serve.order.${orderId}`;
const sequenceKey = "serve.order.sequence";

export function loadBasket(tableNumber: string): BasketLine[] {
  const raw = sessionStorage.getItem(basketKey(tableNumber));
  if (!raw) return [];
  const parsed = JSON.parse(raw) as BasketLine[];
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (line) =>
      typeof line.itemId === "string" &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0 &&
      typeof line.note === "string",
  );
}

export function saveBasket(tableNumber: string, lines: BasketLine[]) {
  sessionStorage.setItem(basketKey(tableNumber), JSON.stringify(lines));
}

export function quoteBasket(lines: BasketLine[]) {
  const items: PlacedLine[] = lines.map((line) => {
    const item = getItem(line.itemId);
    if (!item || !item.available) {
      throw new Error("UNAVAILABLE");
    }
    const quantity = Math.min(99, Math.max(1, line.quantity));
    return {
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      note: line.note.trim().slice(0, 240),
      lineTotal: item.price * quantity,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal, tax: 0, total: subtotal };
}

export function placeLocalOrder(
  tableNumber: string,
  lines: BasketLine[],
  customerNote: string,
): PlacedOrder {
  const quote = quoteBasket(lines);
  const current = Number(sessionStorage.getItem(sequenceKey) ?? "1041");
  const orderNumber = Number.isFinite(current) ? current + 1 : 1042;
  const order: PlacedOrder = {
    id: crypto.randomUUID(),
    token: crypto.randomUUID().replace(/-/g, ""),
    orderNumber,
    tableNumber,
    items: quote.items,
    note: customerNote.trim().slice(0, 500),
    subtotal: quote.subtotal,
    tax: quote.tax,
    total: quote.total,
    paymentStatus: "unpaid",
    fulfillmentStatus: "pending",
    createdAt: new Date().toISOString(),
  };
  sessionStorage.setItem(sequenceKey, String(orderNumber));
  sessionStorage.setItem(orderKey(order.id), JSON.stringify(order));
  sessionStorage.removeItem(basketKey(tableNumber));
  return order;
}

export function loadOrder(orderId: string): PlacedOrder | null {
  const raw = sessionStorage.getItem(orderKey(orderId));
  if (!raw) return null;
  return JSON.parse(raw) as PlacedOrder;
}
