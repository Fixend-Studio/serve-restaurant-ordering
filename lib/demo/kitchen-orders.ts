import { getItem } from "@/lib/demo/menu";
import type {
  DemoKitchenSource,
  KitchenBoardEvent,
  KitchenLine,
  KitchenTicket,
} from "@/lib/kitchen/types";

/**
 * Sample kitchen tickets for the display only.
 * They live in memory for this browser tab. They are not written to
 * sessionStorage, and they are not the guest checkout orders.
 * Reloading the page reseeds the board. Nothing is marked paid.
 */

const LOAD_DELAY_MS = 420;

function line(itemId: string, quantity: number, note = ""): KitchenLine {
  const item = getItem(itemId);
  if (!item) throw new Error(`Unknown menu item: ${itemId}`);
  return { id: item.id, name: item.name, quantity, note };
}

function ago(minutes: number, seconds = 0) {
  return new Date(Date.now() - (minutes * 60 + seconds) * 1000).toISOString();
}

function cloneTicket(ticket: KitchenTicket): KitchenTicket {
  return {
    ...ticket,
    items: ticket.items.map((item) => ({ ...item })),
  };
}

function seedTickets(): KitchenTicket[] {
  return [
    {
      id: "demo-1042",
      orderNumber: 1042,
      tableNumber: "4",
      items: [
        line("tikka", 2, "Extra lemon"),
        line("naan", 3),
      ],
      note: "",
      paymentStatus: "unpaid",
      status: "new",
      createdAt: ago(0, 40),
      acceptedAt: null,
      preparingAt: null,
      readyAt: null,
      completedAt: null,
    },
    {
      id: "demo-1043",
      orderNumber: 1043,
      tableNumber: "8",
      items: [line("bhaji", 1), line("roti", 2)],
      note: "",
      paymentStatus: "unpaid",
      status: "new",
      createdAt: ago(5),
      acceptedAt: ago(1),
      preparingAt: null,
      readyAt: null,
      completedAt: null,
    },
    {
      id: "demo-1044",
      orderNumber: 1044,
      tableNumber: "12",
      items: [
        line("biryani", 1, "No fried onion"),
        line("lime", 2, "Salty"),
      ],
      note: "One guest is avoiding onion.",
      paymentStatus: "unpaid",
      status: "new",
      createdAt: ago(9),
      acceptedAt: null,
      preparingAt: null,
      readyAt: null,
      completedAt: null,
    },
    {
      id: "demo-1045",
      orderNumber: 1045,
      tableNumber: "2",
      items: [
        line("handi", 1, "Less chilli"),
        line("naan", 2),
      ],
      note: "",
      paymentStatus: "unpaid",
      status: "preparing",
      createdAt: ago(15),
      acceptedAt: ago(14),
      preparingAt: ago(13),
      readyAt: null,
      completedAt: null,
    },
    {
      id: "demo-1046",
      orderNumber: 1046,
      tableNumber: "9",
      items: [
        line("samosa", 2, "Chutney on the side"),
        line("jamun", 1, "Warm"),
      ],
      note: "Jamun goes out after the samosas.",
      paymentStatus: "unpaid",
      status: "preparing",
      createdAt: ago(22),
      acceptedAt: ago(21),
      preparingAt: ago(20),
      readyAt: null,
      completedAt: null,
    },
    {
      id: "demo-1047",
      orderNumber: 1047,
      tableNumber: "1",
      items: [
        line("firni", 2),
        line("mint", 2, "Less sugar"),
      ],
      note: "",
      paymentStatus: "unpaid",
      status: "ready",
      createdAt: ago(16),
      acceptedAt: ago(15),
      preparingAt: ago(14),
      readyAt: ago(2),
      completedAt: null,
    },
    {
      id: "demo-1048",
      orderNumber: 1048,
      tableNumber: "6",
      items: [
        line("tikka", 1),
        line("roti", 4, "One extra charred"),
      ],
      note: "",
      paymentStatus: "unpaid",
      status: "ready",
      createdAt: ago(28),
      acceptedAt: ago(27),
      preparingAt: ago(26),
      readyAt: ago(9),
      completedAt: null,
    },
  ];
}

const arrivals: Array<Pick<KitchenTicket, "tableNumber" | "items" | "note">> = [
  {
    tableNumber: "5",
    items: [line("handi", 1, "No cream"), line("naan", 1)],
    note: "Window table, in a hurry.",
  },
  {
    tableNumber: "10",
    items: [line("biryani", 2), line("lime", 2, "Sweet")],
    note: "",
  },
  {
    tableNumber: "3",
    items: [line("samosa", 1), line("firni", 1)],
    note: "They are sharing the samosa.",
  },
  {
    tableNumber: "7",
    items: [line("bhaji", 2), line("roti", 4), line("mint", 2)],
    note: "",
  },
];

function createDemoKitchenSource(): DemoKitchenSource {
  const tickets = seedTickets();
  const listeners = new Set<(event: KitchenBoardEvent) => void>();
  let nextNumber = tickets.reduce((max, ticket) => Math.max(max, ticket.orderNumber), 0) + 1;
  let arrival = 0;

  function emit(event: KitchenBoardEvent) {
    for (const listener of listeners) listener(event);
  }

  function commit(id: string, change: (ticket: KitchenTicket) => KitchenTicket | null) {
    const index = tickets.findIndex((ticket) => ticket.id === id);
    const current = index < 0 ? undefined : tickets[index];
    if (!current) return;
    const next = change(cloneTicket(current));
    if (!next) return;
    tickets[index] = next;
    emit({ type: "upsert", ticket: cloneTicket(next) });
  }

  return {
    mode: "demo",
    async load() {
      await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));
      return tickets.map(cloneTicket);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async accept(id) {
      commit(id, (ticket) => {
        if (ticket.status !== "new" || ticket.acceptedAt) return null;
        return { ...ticket, acceptedAt: new Date().toISOString() };
      });
    },
    async startPreparation(id) {
      const now = new Date().toISOString();
      commit(id, (ticket) => {
        if (ticket.status !== "new") return null;
        return {
          ...ticket,
          status: "preparing",
          acceptedAt: ticket.acceptedAt ?? now,
          preparingAt: now,
        };
      });
    },
    async markReady(id) {
      commit(id, (ticket) => {
        if (ticket.status !== "preparing") return null;
        return { ...ticket, status: "ready", readyAt: new Date().toISOString() };
      });
    },
    async complete(id) {
      commit(id, (ticket) => {
        if (ticket.status !== "ready") return null;
        return {
          ...ticket,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
      });
    },
    receiveDemoOrder() {
      const preset = arrivals[arrival % arrivals.length]!;
      arrival += 1;
      const ticket: KitchenTicket = {
        id: crypto.randomUUID(),
        orderNumber: nextNumber,
        tableNumber: preset.tableNumber,
        items: preset.items.map((item) => ({ ...item })),
        note: preset.note,
        paymentStatus: "unpaid",
        status: "new",
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
      };
      nextNumber += 1;
      tickets.unshift(ticket);
      const copy = cloneTicket(ticket);
      emit({ type: "upsert", ticket: copy });
      return cloneTicket(ticket);
    },
  };
}

let demoSource: DemoKitchenSource | null = null;

export function getDemoKitchenSource() {
  if (typeof window === "undefined") {
    throw new Error("The demo kitchen source only runs in the browser.");
  }
  demoSource ??= createDemoKitchenSource();
  return demoSource;
}
