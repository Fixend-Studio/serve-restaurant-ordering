"use client";

import Link from "next/link";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KitchenColumn, kitchenColumnMeta } from "@/components/kitchen/kitchen-column";
import { Button } from "@/components/ui/button";
import { formatKitchenClock, formatKitchenTime } from "@/lib/kitchen/elapsed";
import { applyKitchenEvent } from "@/lib/kitchen/events";
import {
  getKitchenChime,
  getSoundPreferenceServerSnapshot,
  getSoundPreferenceSnapshot,
  setSoundPreference,
  subscribeSoundPreference,
} from "@/lib/kitchen/sound";
import { getKitchenSource, isDemoKitchenSource } from "@/lib/kitchen/source";
import type {
  KitchenAction,
  KitchenBoardEvent,
  KitchenBoardSource,
  KitchenColumn as KitchenColumnId,
  KitchenTicket,
} from "@/lib/kitchen/types";
import { KITCHEN_COLUMNS } from "@/lib/kitchen/types";
import { cn } from "@/lib/utils";

type Banner = {
  key: number;
  orderNumber: number;
  tableNumber: string;
};

export function KitchenBoard() {
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const soundOn = useSyncExternalStore(
    subscribeSoundPreference,
    getSoundPreferenceSnapshot,
    getSoundPreferenceServerSnapshot,
  );
  const [unlocked, setUnlocked] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [focus, setFocus] = useState<KitchenColumnId>("new");
  const [showCompleted, setShowCompleted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const sourceRef = useRef<KitchenBoardSource | null>(null);
  const soundOnRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const bannerKey = useRef(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const start = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!soundOn || unlocked) return;
    const onPointer = () => {
      void getKitchenChime()
        .unlock()
        .then(() => {
          if (!getSoundPreferenceSnapshot()) return;
          soundOnRef.current = true;
          setUnlocked(true);
        });
    };
    window.addEventListener("pointerdown", onPointer, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointer, { capture: true });
  }, [soundOn, unlocked]);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 6500);
    return () => window.clearTimeout(id);
  }, [banner]);

  useEffect(() => {
    let cancelled = false;
    let open = false;
    const source = getKitchenSource();
    sourceRef.current = source;
    const queued: KitchenBoardEvent[] = [];

    function announce(ticket: KitchenTicket) {
      bannerKey.current += 1;
      setBanner({
        key: bannerKey.current,
        orderNumber: ticket.orderNumber,
        tableNumber: ticket.tableNumber,
      });
      setShowCompleted(false);
      if (soundOnRef.current) getKitchenChime().play();
    }

    const unsubscribe = source.subscribe((event) => {
      if (!open) {
        queued.push(event);
        return;
      }
      if (cancelled) return;
      if (
        event.type === "upsert" &&
        !seenRef.current.has(event.ticket.id) &&
        event.ticket.status === "new"
      ) {
        announce(event.ticket);
      }
      if (event.type === "upsert") seenRef.current.add(event.ticket.id);
      if (event.type === "remove") seenRef.current.delete(event.id);
      if (event.type === "snapshot") {
        seenRef.current = new Set(event.tickets.map((ticket) => ticket.id));
      }
      setTickets((current) => applyKitchenEvent(current, event));
    });

    source
      .load()
      .then((initial) => {
        if (cancelled) return;
        let next = initial;
        const known = new Set(initial.map((ticket) => ticket.id));
        for (const event of queued) {
          if (
            event.type === "upsert" &&
            !known.has(event.ticket.id) &&
            event.ticket.status === "new"
          ) {
            announce(event.ticket);
          }
          next = applyKitchenEvent(next, event);
        }
        seenRef.current = new Set(next.map((ticket) => ticket.id));
        open = true;
        setDemoMode(isDemoKitchenSource(source));
        setTickets(next);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
      open = false;
      unsubscribe();
    };
  }, [attempt]);

  async function toggleSound() {
    if (soundOn) {
      soundOnRef.current = false;
      setUnlocked(false);
      setSoundPreference(false);
      return;
    }
    await getKitchenChime().unlock();
    soundOnRef.current = true;
    setUnlocked(true);
    setSoundPreference(true);
  }

  async function sendDemo() {
    const source = sourceRef.current;
    if (!source || !isDemoKitchenSource(source) || loadState !== "ready") return;
    if (soundOn) {
      await getKitchenChime().unlock();
      soundOnRef.current = true;
      setUnlocked(true);
    }
    source.receiveDemoOrder();
  }

  async function run(id: string, action: KitchenAction) {
    const source = sourceRef.current;
    if (!source || busyId) return;
    setBusyId(id);
    try {
      if (action === "accept") await source.accept(id);
      else if (action === "start") await source.startPreparation(id);
      else if (action === "ready") await source.markReady(id);
      else await source.complete(id);
    } finally {
      setBusyId((current) => (current === id ? null : current));
    }
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== "completed");
  const completed = tickets
    .filter((ticket) => ticket.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const clock = now === null ? null : formatKitchenClock(now);
  const bannerText = banner
    ? `New order ${banner.orderNumber} · Table ${banner.tableNumber}${soundOn ? "" : " · Sound is off"}`
    : "";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 bg-foreground text-background">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[11px] tracking-[0.28em] text-background/70 uppercase"
            >
              Serve
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-3xl leading-none tracking-tight">Kitchen</h1>
                <span className="rounded-full border border-background/25 px-2 py-0.5 text-[10px] tracking-[0.16em] text-background/70 uppercase">
                  Demo
                </span>
              </div>
              <p className="mt-1 text-xs text-background/60">
                Mehr
                {loadState === "ready"
                  ? openTickets.length === 0
                    ? " · pass is clear"
                    : ` · ${openTickets.length} open`
                  : " · demo service"}
              </p>
            </div>
          </div>

          <p className="font-mono text-sm text-background/75 tabular-nums" suppressHydrationWarning>
            {clock ?? "–:–"}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={soundOn ? "primary" : "secondary"}
              aria-pressed={soundOn}
              onClick={() => void toggleSound()}
            >
              {soundOn ? (
                <Volume2 className="size-4" aria-hidden />
              ) : (
                <VolumeX className="size-4" aria-hidden />
              )}
              {soundOn ? "Sound on" : "Sound off"}
            </Button>
            {demoMode ? (
              <Button variant="secondary" disabled={loadState !== "ready"} onClick={() => void sendDemo()}>
                <Bell className="size-4" aria-hidden />
                Demo ticket
              </Button>
            ) : null}
            <Button
              variant={showCompleted ? "primary" : "secondary"}
              aria-pressed={showCompleted}
              disabled={loadState !== "ready"}
              onClick={() => setShowCompleted((open) => !open)}
            >
              {showCompleted
                ? "Back to board"
                : completed.length > 0
                  ? `Completed ${completed.length}`
                  : "Completed"}
            </Button>
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={cn(
            "px-4 text-sm md:px-6",
            banner ? "bg-accent py-2.5 text-accent-foreground" : "sr-only",
          )}
        >
          {bannerText}
        </div>

        {loadState === "ready" && now !== null && !showCompleted ? (
          <div className="flex gap-1 px-3 pb-3 md:hidden">
            {KITCHEN_COLUMNS.map((column) => {
              const count = tickets.filter((ticket) => ticket.status === column).length;
              const selected = focus === column;
              return (
                <button
                  key={column}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFocus(column)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm",
                    selected ? "bg-background text-foreground" : "bg-background/10 text-background",
                  )}
                >
                  {kitchenColumnMeta[column].title}
                  <span className="tabular-nums">{count}</span>
                  {banner && column === "new" && !selected ? (
                    <span className="size-1.5 rounded-full bg-background" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      {loadState === "error" ? (
        <BoardError
          onRetry={() => {
            setLoadState("loading");
            setAttempt((value) => value + 1);
          }}
        />
      ) : loadState !== "ready" || now === null ? (
        <BoardSkeleton />
      ) : showCompleted ? (
        <CompletedList tickets={completed} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 md:grid-cols-3 md:p-4">
          {KITCHEN_COLUMNS.map((column) => (
            <KitchenColumn
              key={column}
              column={column}
              tickets={tickets.filter((ticket) => ticket.status === column)}
              now={now}
              busyId={busyId}
              onAction={(id, action) => void run(id, action)}
              className={column === focus ? undefined : "max-md:hidden"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-3 md:p-4"
      aria-busy="true"
    >
      <p className="sr-only">Loading the kitchen board.</p>
      {KITCHEN_COLUMNS.map((column, index) => (
        <div
          key={column}
          className={cn(
            "animate-pulse rounded-[1.75rem] bg-[#efe6da]/80 p-4",
            index > 0 && "hidden md:block",
          )}
        >
          <div className="h-8 w-28 rounded-full bg-line" />
          <div className="mt-2 h-4 w-40 rounded-full bg-line/70" />
          <div className="mt-4 h-48 rounded-2xl bg-card" />
          <div className="mt-3 h-40 rounded-2xl bg-card/80" />
        </div>
      ))}
    </div>
  );
}

function BoardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h2 className="font-serif text-4xl tracking-tight">The board did not load.</h2>
      <p className="mt-3 max-w-sm leading-7 text-muted">
        The kitchen display is still open. Try loading the tickets again.
      </p>
      <Button className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function CompletedList({ tickets }: { tickets: KitchenTicket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <div>
          <h2 className="font-serif text-4xl tracking-tight">Nothing completed yet</h2>
          <p className="mx-auto mt-3 max-w-sm leading-7 text-muted">
            A ticket leaves the pass when the floor takes it. This list lasts until the
            board is reloaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="kitchen-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="font-serif text-3xl tracking-tight">Completed</h2>
        <p className="mt-1 text-sm text-muted">Left the pass this sitting.</p>
        <ul className="mt-5 flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-2xl border border-line bg-card px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-2xl tabular-nums">{ticket.orderNumber}</p>
                <p className="text-sm text-muted">Table {ticket.tableNumber}</p>
              </div>
              <p className="mt-1 text-sm leading-6">
                {ticket.items.map((item) => `${item.quantity} ${item.name}`).join(", ")}
              </p>
              {ticket.completedAt ? (
                <p className="mt-1 text-xs text-muted">
                  Completed {formatKitchenTime(ticket.completedAt)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
