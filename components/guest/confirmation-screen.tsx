"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGuestSession } from "@/components/guest/guest-session";
import { loadOrder, type PlacedOrder } from "@/lib/guest/orders";
import { formatRupees } from "@/lib/money";

export function ConfirmationScreen({ orderId }: { orderId: string }) {
  const session = useGuestSession();
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);

  useEffect(() => {
    if (!orderId) return;
    setOrder(loadOrder(orderId));
  }, [orderId]);

  if (order === undefined) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-10">
        <div className="h-4 w-24 rounded-full bg-line" />
        <div className="mt-4 h-12 w-56 rounded-lg bg-line/80" />
      </main>
    );
  }

  if (!order || order.tableNumber !== session.tableNumber) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-serif text-4xl tracking-tight">
          This order is not on this phone.
        </h1>
        <p className="mt-4 text-muted leading-7">
          Receipts stay on the device that sent them. Ask the floor for table{" "}
          {session.tableNumber} if the kitchen already has a copy.
        </p>
        <Link
          href={`/table/${session.tableNumber}`}
          className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-accent px-6 text-accent-foreground"
        >
          Return to the menu
        </Link>
      </main>
    );
  }

  const placed = new Intl.DateTimeFormat("en-PK", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  }).format(new Date(order.createdAt));

  return (
    <main className="mx-auto w-full max-w-xl px-5 pt-10 pb-16">
      <p className="text-xs tracking-[0.18em] text-muted uppercase">
        Table {order.tableNumber} · {placed}
      </p>
      <h1 className="mt-3 font-serif text-5xl tracking-tight">
        Order {order.orderNumber}
      </h1>
      <p className="mt-4 max-w-sm text-lg leading-8">
        Sent to the kitchen. Pay at the counter when it arrives.
      </p>

      <div className="mt-6 flex gap-2 text-sm">
        <span className="rounded-full bg-foreground px-3 py-1 text-background">
          Pending
        </span>
        <span className="rounded-full border border-line px-3 py-1">Unpaid</span>
      </div>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.itemId} className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="font-serif text-xl">
                {item.quantity} × {item.name}
              </p>
              {item.note ? <p className="mt-1 text-sm text-muted">{item.note}</p> : null}
            </div>
            <p className="tabular-nums">{formatRupees(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      {order.note ? <p className="mt-4 text-sm text-muted">Note: {order.note}</p> : null}

      <div className="mt-6 flex items-baseline justify-between">
        <p className="text-muted">Total</p>
        <p className="font-serif text-3xl tabular-nums">{formatRupees(order.total)}</p>
      </div>

      <Link
        href={`/table/${session.tableNumber}`}
        className="mt-10 inline-flex h-12 items-center rounded-full border border-line bg-card px-5"
      >
        Order something else
      </Link>
    </main>
  );
}
