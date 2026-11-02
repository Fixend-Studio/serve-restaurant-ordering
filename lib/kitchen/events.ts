import type { KitchenBoardEvent, KitchenTicket } from "@/lib/kitchen/types";

export function applyKitchenEvent(
  tickets: KitchenTicket[],
  event: KitchenBoardEvent,
): KitchenTicket[] {
  if (event.type === "snapshot") return event.tickets;
  if (event.type === "remove") {
    return tickets.filter((ticket) => ticket.id !== event.id);
  }
  const index = tickets.findIndex((ticket) => ticket.id === event.ticket.id);
  if (index === -1) return [event.ticket, ...tickets];
  const next = tickets.slice();
  next[index] = event.ticket;
  return next;
}

/** Oldest first. Unaccepted tickets stay above ones the kitchen has accepted. */
export function compareActiveTickets(a: KitchenTicket, b: KitchenTicket) {
  if (a.status === "new" && b.status === "new") {
    const accepted = Number(a.acceptedAt !== null) - Number(b.acceptedAt !== null);
    if (accepted !== 0) return accepted;
  }
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return a.orderNumber - b.orderNumber;
}
