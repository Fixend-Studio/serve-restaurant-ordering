"use client";

import { OrderCard } from "@/components/kitchen/order-card";
import { urgencyFor } from "@/lib/kitchen/elapsed";
import { compareActiveTickets } from "@/lib/kitchen/events";
import type { KitchenAction, KitchenColumn, KitchenTicket } from "@/lib/kitchen/types";
import { cn } from "@/lib/utils";

export const kitchenColumnMeta: Record<
  KitchenColumn,
  { title: string; hint: string; emptyTitle: string; emptyBody: string }
> = {
  new: {
    title: "New",
    hint: "Arrived, not on the line",
    emptyTitle: "No new tickets",
    emptyBody: "Orders land here as soon as a table sends them.",
  },
  preparing: {
    title: "Preparing",
    hint: "On the line",
    emptyTitle: "Nothing on the line",
    emptyBody: "Start a ticket and it moves here while it cooks.",
  },
  ready: {
    title: "Ready",
    hint: "At the pass",
    emptyTitle: "The pass is clear",
    emptyBody: "Finished plates wait here until the floor takes them.",
  },
};

export function KitchenColumn({
  column,
  tickets,
  now,
  busyId,
  onAction,
  className,
}: {
  column: KitchenColumn;
  tickets: KitchenTicket[];
  now: number;
  busyId: string | null;
  onAction: (id: string, action: KitchenAction) => void;
  className?: string;
}) {
  const meta = kitchenColumnMeta[column];
  const ordered = tickets.slice().sort(compareActiveTickets);
  const late = ordered.some((ticket) => urgencyFor(ticket, now) === "late");

  return (
    <section
      aria-label={`${meta.title}. ${ordered.length} ${ordered.length === 1 ? "ticket" : "tickets"}.`}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-[#efe6da]/70 p-3",
        className,
      )}
    >
      <header className="flex items-end justify-between gap-3 px-2 pt-1 pb-3">
        <div>
          <h2 className="font-serif text-[2rem] leading-none tracking-tight">{meta.title}</h2>
          <p className="mt-1 text-sm text-muted">{meta.hint}</p>
        </div>
        <p
          className={cn(
            "font-serif text-4xl leading-none tabular-nums",
            late && "text-accent",
          )}
        >
          {ordered.length}
        </p>
      </header>

      <div className="kitchen-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
        {ordered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="font-serif text-2xl tracking-tight">{meta.emptyTitle}</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{meta.emptyBody}</p>
          </div>
        ) : (
          ordered.map((ticket) => (
            <OrderCard
              key={ticket.id}
              ticket={ticket}
              now={now}
              busy={busyId === ticket.id}
              onAction={(action) => onAction(ticket.id, action)}
            />
          ))
        )}
      </div>
    </section>
  );
}
