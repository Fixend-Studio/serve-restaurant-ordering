import type { KitchenStatus, KitchenTicket } from "@/lib/kitchen/types";

export const KITCHEN_TIME_ZONE = "Asia/Karachi";

const minute = 60_000;

/**
 * Time a ticket may spend in a column before the board marks it.
 * New uses time since the order was placed. Preparing and Ready use time
 * in that stage, so a plate that just reached the pass is not already late.
 */
export const stageBudgetMs: Record<
  Exclude<KitchenStatus, "completed">,
  { due: number; late: number }
> = {
  new: { due: 3 * minute, late: 8 * minute },
  preparing: { due: 12 * minute, late: 18 * minute },
  ready: { due: 4 * minute, late: 8 * minute },
};

export type Urgency = "calm" | "due" | "late";

const kitchenClock = new Intl.DateTimeFormat("en-PK", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: KITCHEN_TIME_ZONE,
});

export function formatKitchenTime(iso: string) {
  return kitchenClock.format(new Date(iso));
}

export function formatKitchenClock(now: number) {
  return kitchenClock.format(now);
}

export function ageMs(iso: string, now: number) {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, now - parsed);
}

export function stageStartedAt(ticket: KitchenTicket) {
  if (ticket.status === "preparing") return ticket.preparingAt ?? ticket.createdAt;
  if (ticket.status === "ready") return ticket.readyAt ?? ticket.createdAt;
  if (ticket.status === "completed") return ticket.completedAt ?? ticket.createdAt;
  return ticket.createdAt;
}

export function urgencyFor(ticket: KitchenTicket, now: number): Urgency {
  if (ticket.status === "completed") return "calm";
  const elapsed = ageMs(stageStartedAt(ticket), now);
  const budget = stageBudgetMs[ticket.status];
  if (elapsed >= budget.late) return "late";
  if (elapsed >= budget.due) return "due";
  return "calm";
}

export function formatElapsed(ms: number) {
  const minutes = Math.floor(ms / minute);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function describeElapsed(ms: number) {
  const minutes = Math.floor(ms / minute);
  if (minutes < 1) return "less than a minute";
  if (minutes === 1) return "1 minute";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  if (rest === 0) return hourLabel;
  if (rest === 1) return `${hourLabel} 1 minute`;
  return `${hourLabel} ${rest} minutes`;
}
