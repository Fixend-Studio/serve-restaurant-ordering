"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  ageMs,
  describeElapsed,
  formatElapsed,
  formatKitchenTime,
  stageStartedAt,
  urgencyFor,
  type Urgency,
} from "@/lib/kitchen/elapsed";
import type { KitchenAction, KitchenPaymentStatus, KitchenTicket } from "@/lib/kitchen/types";
import { cn } from "@/lib/utils";

const paymentLabels: Record<KitchenPaymentStatus, string> = {
  unpaid: "Unpaid",
  processing: "Processing",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

function statusLabel(ticket: KitchenTicket) {
  if (ticket.status === "new") return ticket.acceptedAt ? "Accepted" : "New";
  if (ticket.status === "preparing") return "Preparing";
  return "Ready";
}

function statusPill(ticket: KitchenTicket) {
  if (ticket.status === "new" && !ticket.acceptedAt) {
    return "bg-accent text-accent-foreground";
  }
  if (ticket.status === "new") return "border border-line bg-card text-foreground";
  if (ticket.status === "preparing") return "bg-foreground text-background";
  return "bg-warn text-accent-foreground";
}

function rail(urgency: Urgency) {
  if (urgency === "late") return "bg-accent";
  if (urgency === "due") return "bg-warn";
  return "bg-line";
}

function surface(urgency: Urgency) {
  if (urgency === "late") return "border-accent bg-late-soft";
  if (urgency === "due") return "border-warn bg-warn-soft";
  return "border-line bg-card";
}

function stageCopy(ticket: KitchenTicket, now: number) {
  const elapsed = formatElapsed(ageMs(stageStartedAt(ticket), now));
  if (ticket.status === "preparing") return `Cooking ${elapsed}`;
  if (ticket.status === "ready") return `Holding ${elapsed}`;
  if (ticket.acceptedAt) return "Accepted, not started";
  return null;
}

export function OrderCard({
  ticket,
  now,
  busy,
  onAction,
}: {
  ticket: KitchenTicket;
  now: number;
  busy: boolean;
  onAction: (action: KitchenAction) => void;
}) {
  const reduce = useReducedMotion();
  const urgency = urgencyFor(ticket, now);
  const orderAge = ageMs(ticket.createdAt, now);
  const stage = stageCopy(ticket, now);
  const urgencyWord = urgency === "late" ? "Late" : urgency === "due" ? "Due" : "";
  const spoken = [
    `Order ${ticket.orderNumber}, table ${ticket.tableNumber}.`,
    `${statusLabel(ticket)}.`,
    `Placed ${formatKitchenTime(ticket.createdAt)}.`,
    `Elapsed ${describeElapsed(orderAge)}.`,
    urgencyWord,
    stage,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      aria-label={spoken}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl border p-4 pl-5 shadow-[0_10px_30px_rgba(36,28,24,0.05)]",
        surface(urgency),
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", rail(urgency))} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ticket.status === "new" && !ticket.acceptedAt ? (
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full rounded-full bg-accent opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase",
                statusPill(ticket),
              )}
            >
              {statusLabel(ticket)}
            </span>
            {urgencyWord ? (
              <span
                className={cn(
                  "text-[11px] tracking-[0.14em] uppercase",
                  urgency === "late" ? "text-accent" : "text-warn",
                )}
              >
                {urgencyWord}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-serif text-4xl leading-none tracking-tight tabular-nums">
            {ticket.orderNumber}
          </h3>
        </div>
        <p className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-sm text-background tabular-nums">
          Table {ticket.tableNumber}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <time dateTime={ticket.createdAt} className="text-sm text-muted">
          {formatKitchenTime(ticket.createdAt)}
        </time>
        <p className="text-right">
          <span className="block text-[10px] tracking-[0.16em] text-muted uppercase">
            Elapsed
          </span>
          <span className="font-mono text-xl leading-none tabular-nums">
            {formatElapsed(orderAge)}
          </span>
        </p>
      </div>

      {stage ? (
        <p
          className={cn(
            "mt-1 text-sm",
            urgency === "late" ? "text-accent" : urgency === "due" ? "text-warn" : "text-muted",
          )}
        >
          {stage}
        </p>
      ) : null}

      <ul className="mt-3 divide-y divide-foreground/10 border-t border-foreground/10">
        {ticket.items.map((item) => (
          <li key={item.id} className="flex gap-3 py-2.5">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#efe6da] px-2 font-medium tabular-nums">
              {item.quantity}
            </span>
            <div className="min-w-0 pt-1">
              <p className="font-serif text-lg leading-6">{item.name}</p>
              {item.note ? (
                <p className="mt-0.5 text-sm leading-5 text-accent">{item.note}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {ticket.note ? (
        <p className="mt-3 rounded-xl bg-[#efe6da] px-3 py-2 text-sm leading-5">
          <span className="text-muted">Table note. </span>
          {ticket.note}
        </p>
      ) : null}

      <p
        className={cn(
          "mt-3 inline-flex rounded-full px-2.5 py-1 text-xs",
          ticket.paymentStatus === "paid"
            ? "bg-[#efe6da] text-foreground"
            : ticket.paymentStatus === "failed" || ticket.paymentStatus === "refunded"
              ? "bg-late-soft text-accent"
              : "border border-line text-muted",
        )}
      >
        {paymentLabels[ticket.paymentStatus]}
      </p>

      <div className="mt-4 grid gap-2">
        {ticket.status === "new" && !ticket.acceptedAt ? (
          <Button className="h-12 w-full" disabled={busy} onClick={() => onAction("accept")}>
            Accept
          </Button>
        ) : null}
        {ticket.status === "new" ? (
          <Button
            variant={ticket.acceptedAt ? "primary" : "secondary"}
            className="h-auto min-h-12 w-full py-3 whitespace-normal"
            disabled={busy}
            onClick={() => onAction("start")}
          >
            Start preparation
          </Button>
        ) : null}
        {ticket.status === "preparing" ? (
          <Button className="h-12 w-full" disabled={busy} onClick={() => onAction("ready")}>
            Mark ready
          </Button>
        ) : null}
        {ticket.status === "ready" ? (
          <Button className="h-12 w-full" disabled={busy} onClick={() => onAction("complete")}>
            Complete
          </Button>
        ) : null}
      </div>
    </motion.article>
  );
}
