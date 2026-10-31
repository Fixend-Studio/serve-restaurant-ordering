"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BasketBar } from "@/components/guest/basket-bar";
import { ItemSheet } from "@/components/guest/item-sheet";
import { useGuestSession } from "@/components/guest/guest-session";
import {
  categories,
  itemsInCategory,
  restaurant,
  type MenuItem,
} from "@/lib/demo/menu";
import { formatRupees } from "@/lib/money";

export function MenuScreen() {
  const session = useGuestSession();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(categories[0]?.id ?? "start");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  useEffect(() => {
    const nodes = categories
      .map((category) => document.getElementById(category.id))
      .filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.25] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function jumpTo(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <div className="min-w-0">
            <p className="font-serif text-2xl leading-none tracking-tight">
              {restaurant.name}
            </p>
            <p className="mt-1 text-xs tracking-wide text-muted">
              Table {session.tableNumber}
            </p>
          </div>
          <Link
            href={`/table/${session.tableNumber}/checkout`}
            className="text-sm text-muted"
          >
            Basket{" "}
            <span className="text-foreground tabular-nums">
              {session.ready ? session.count : "–"}
            </span>
          </Link>
        </div>
        <nav
          aria-label="Menu categories"
          className="mx-auto flex h-12 w-full max-w-6xl items-end gap-5 overflow-x-auto px-4 [scrollbar-width:none] md:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => {
            const isActive = active === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => jumpTo(category.id)}
                className={`relative shrink-0 pb-3 text-sm ${
                  isActive ? "text-foreground" : "text-muted"
                }`}
                aria-current={isActive ? "true" : undefined}
              >
                {category.name}
                {isActive ? (
                  <motion.span
                    layoutId={reduce ? undefined : "category-mark"}
                    className="absolute inset-x-0 -bottom-px h-px bg-accent"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="h-px bg-line/80" />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 md:px-8">
        <p className="max-w-xl text-sm leading-6 text-muted">{restaurant.summary}</p>

        {categories.map((category) => (
          <section
            key={category.id}
            id={category.id}
            className="menu-section pt-9"
          >
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-3xl tracking-tight">{category.name}</h2>
              <p className="hidden text-sm text-muted lg:block">{category.hint}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {itemsInCategory(category.id).map((item, index) => (
                <DishCard
                  key={item.id}
                  item={item}
                  index={index}
                  quantity={
                    session.lines.find((line) => line.itemId === item.id)?.quantity ?? 0
                  }
                  disabled={!session.ready}
                  onOpen={() => setSelected(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <BasketBar
        count={session.ready ? session.count : 0}
        total={session.subtotal}
        href={`/table/${session.tableNumber}/checkout`}
      />

      <ItemSheet
        item={selected}
        line={session.lines.find((line) => line.itemId === selected?.id)}
        onClose={() => setSelected(null)}
        onCommit={(itemId, quantity, note) => session.commitLine(itemId, quantity, note)}
      />
    </div>
  );
}

function DishCard({
  item,
  index,
  quantity,
  disabled,
  onOpen,
}: {
  item: MenuItem;
  index: number;
  quantity: number;
  disabled: boolean;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const content = (
    <>
      <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-[#efe4d6] md:aspect-[4/3] md:h-auto md:w-full md:rounded-2xl">
        {item.image ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 112px"
            priority={item.id === "tikka"}
            className={`object-cover motion-safe:transition motion-safe:duration-700 md:group-hover:scale-[1.04] ${
              item.available ? "" : "grayscale"
            }`}
          />
        ) : (
          <div className="h-full bg-[#efe4d6] md:aspect-[4/3]" />
        )}
        {quantity > 0 ? (
          <span className="absolute top-2 left-2 rounded-full bg-foreground px-2 py-0.5 text-xs text-background tabular-nums">
            {quantity}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1 md:px-0.5 md:pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl tracking-tight">{item.name}</h3>
          <p className="shrink-0 text-sm tabular-nums">{formatRupees(item.price)}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{item.description}</p>
        {item.available ? (
          <p className="mt-2 text-xs tracking-wide text-accent">
            {quantity > 0 ? "Edit" : "Add"}
          </p>
        ) : (
          <p className="mt-2 text-xs tracking-wide text-sold">Sold out tonight</p>
        )}
      </div>
    </>
  );

  const className =
    "group flex w-full gap-3 rounded-2xl text-left md:block md:overflow-hidden md:bg-card md:shadow-[0_10px_30px_rgba(36,28,24,0.05)] md:transition md:hover:-translate-y-0.5";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.35, delay: reduce ? 0 : Math.min(index, 4) * 0.04 }}
    >
      {item.available ? (
        <button
          type="button"
          className={className}
          onClick={onOpen}
          disabled={disabled}
          aria-haspopup="dialog"
        >
          {content}
        </button>
      ) : (
        <article className={`${className} opacity-80`}>{content}</article>
      )}
    </motion.div>
  );
}
