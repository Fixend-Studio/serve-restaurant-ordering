"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuantityControl } from "@/components/guest/quantity-control";
import { useGuestSession } from "@/components/guest/guest-session";
import { getItem, restaurant } from "@/lib/demo/menu";
import { formatRupees } from "@/lib/money";

const payments = [
  {
    id: "counter",
    title: "Pay at the counter",
    detail: "The kitchen starts now. Settle when the meal arrives.",
    enabled: true,
  },
  {
    id: "card",
    title: "Card",
    detail: "Stripe and local cards will connect here.",
    enabled: false,
  },
] as const;

export function CheckoutScreen() {
  const router = useRouter();
  const session = useGuestSession();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<(typeof payments)[number]["id"]>("counter");

  if (!session.ready) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-10">
        <div className="h-4 w-20 rounded-full bg-line" />
        <div className="mt-6 h-10 w-48 rounded-lg bg-line/80" />
        <div className="mt-8 h-28 rounded-2xl bg-card" />
        <div className="mt-3 h-28 rounded-2xl bg-card" />
      </main>
    );
  }

  if (session.lines.length === 0) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-xs tracking-[0.18em] text-muted uppercase">
          Table {session.tableNumber}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">Your basket is empty.</h1>
        <p className="mt-4 max-w-sm leading-7 text-muted">
          Add a dish from the menu. It will stay on this table until you send it.
        </p>
        <Link
          href={`/table/${session.tableNumber}`}
          className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-foreground px-6 text-background"
        >
          Back to the menu
        </Link>
      </main>
    );
  }

  function submit() {
    if (pending || payment !== "counter") return;
    setPending(true);
    setError(null);
    try {
      const order = session.placeOrder(note);
      router.push(`/table/${session.tableNumber}/order/${order.id}`);
    } catch {
      setError("One of these dishes just sold out. Review the basket and try again.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 pt-6 pb-16">
      <Link href={`/table/${session.tableNumber}`} className="text-sm text-muted">
        Menu
      </Link>
      <p className="mt-8 text-xs tracking-[0.18em] text-muted uppercase">
        {restaurant.name} · Table {session.tableNumber}
      </p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Basket</h1>

      <ul className="mt-8">
        {session.lines.map((line) => {
          const item = getItem(line.itemId);
          if (!item) return null;
          return (
            <li key={line.itemId} className="border-t border-line/80 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl tracking-tight">{item.name}</h2>
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    {formatRupees(item.price)}
                  </p>
                </div>
                <p className="pt-1 tabular-nums">{formatRupees(item.price * line.quantity)}</p>
              </div>
              <div className="mt-4">
                <QuantityControl
                  value={line.quantity}
                  min={0}
                  label={item.name}
                  onChange={(quantity) => session.setQuantity(item.id, quantity)}
                />
              </div>
              <label className="mt-4 block text-sm">
                <span className="text-muted">Special instructions</span>
                <textarea
                  value={line.note}
                  maxLength={240}
                  rows={2}
                  onChange={(event) => session.setNote(item.id, event.target.value)}
                  placeholder="Leave a note for this dish"
                  className="mt-2 w-full resize-none rounded-2xl bg-card px-4 py-3 outline-none ring-1 ring-transparent focus:ring-foreground/15"
                />
              </label>
            </li>
          );
        })}
      </ul>

      <label className="mt-2 block border-t border-line/80 pt-6 text-sm">
        <span className="text-muted">Note for the order</span>
        <textarea
          value={note}
          maxLength={500}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Allergies, or anything the table should know"
          className="mt-2 w-full resize-none rounded-2xl bg-card px-4 py-3 outline-none ring-1 ring-transparent focus:ring-foreground/15"
        />
      </label>

      <fieldset className="mt-8">
        <legend className="font-serif text-2xl tracking-tight">Payment</legend>
        <div className="mt-4 grid gap-3">
          {payments.map((method) => {
            const selected = payment === method.id;
            return (
              <button
                key={method.id}
                type="button"
                disabled={!method.enabled}
                aria-pressed={selected}
                onClick={() => method.enabled && setPayment(method.id)}
                className={`rounded-2xl px-4 py-4 text-left ${
                  selected ? "bg-foreground text-background" : "bg-card text-foreground"
                } disabled:opacity-55`}
              >
                <span className="block text-sm">{method.title}</span>
                <span
                  className={`mt-1 block text-sm leading-5 ${
                    selected ? "text-background/70" : "text-muted"
                  }`}
                >
                  {method.detail}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatRupees(session.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Tax</dt>
          <dd className="tabular-nums">{formatRupees(0)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Service charge</dt>
          <dd className="tabular-nums">{formatRupees(0)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line/80 pt-4">
          <dt className="font-serif text-2xl">Total</dt>
          <dd className="font-serif text-3xl tabular-nums">{formatRupees(session.subtotal)}</dd>
        </div>
      </dl>

      {error ? (
        <p className="mt-5 rounded-2xl bg-[#f3ddd6] px-4 py-3 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="button" size="lg" className="mt-6 w-full" disabled={pending} onClick={submit}>
        {pending ? "Sending to the kitchen" : "Send to the kitchen"}
      </Button>
    </main>
  );
}
