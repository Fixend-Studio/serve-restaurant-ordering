/**
 * Kitchen board model.
 *
 * The screen talks only to KitchenBoardSource. Demo tickets implement it in
 * memory. A later Supabase source can subscribe to realtime on `orders` and
 * `order_items` and emit the same events, without changing the board UI.
 *
 * Fulfillment mapping when that source is written:
 * - new        → orders.fulfillment_status 'pending'
 * - preparing  → 'in_progress'
 * - ready      → pass stage. The schema has no ready value yet; keep it here.
 * - completed  → 'served', then the ticket leaves the active columns
 *
 * Payment is read-only. The kitchen never writes payment_status.
 */

export const KITCHEN_COLUMNS = ["new", "preparing", "ready"] as const;

export type KitchenColumn = (typeof KITCHEN_COLUMNS)[number];

export type KitchenStatus = KitchenColumn | "completed";

export type KitchenPaymentStatus =
  | "unpaid"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export type KitchenAction = "accept" | "start" | "ready" | "complete";

export type KitchenLine = {
  id: string;
  name: string;
  quantity: number;
  note: string;
};

export type KitchenTicket = {
  id: string;
  orderNumber: number;
  tableNumber: string;
  items: KitchenLine[];
  note: string;
  paymentStatus: KitchenPaymentStatus;
  status: KitchenStatus;
  createdAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
};

export type KitchenBoardEvent =
  | { type: "snapshot"; tickets: KitchenTicket[] }
  | { type: "upsert"; ticket: KitchenTicket }
  | { type: "remove"; id: string };

export interface KitchenBoardSource {
  readonly mode: "demo" | "live";
  load(): Promise<KitchenTicket[]>;
  subscribe(listener: (event: KitchenBoardEvent) => void): () => void;
  accept(id: string): Promise<void>;
  startPreparation(id: string): Promise<void>;
  markReady(id: string): Promise<void>;
  complete(id: string): Promise<void>;
}

export interface DemoKitchenSource extends KitchenBoardSource {
  readonly mode: "demo";
  receiveDemoOrder(): KitchenTicket;
}
