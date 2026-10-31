"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatRupees } from "@/lib/money";

export function BasketBar({
  count,
  total,
  href,
}: {
  count: number;
  total: number;
  href: string;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          key="basket-bar"
          className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          initial={reduce ? false : { y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 28, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-full bg-foreground px-3 py-2 pl-5 text-background shadow-[0_12px_40px_rgba(36,28,24,0.22)]">
            <div className="min-w-0">
              <p className="text-xs text-background/70">
                <motion.span
                  key={count}
                  initial={reduce ? false : { scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="inline-block tabular-nums"
                  aria-live="polite"
                >
                  {count}
                </motion.span>{" "}
                {count === 1 ? "item" : "items"}
              </p>
              <p className="font-serif text-xl leading-none tabular-nums">
                {formatRupees(total)}
              </p>
            </div>
            <Link
              href={href}
              className="inline-flex h-11 shrink-0 items-center rounded-full bg-accent px-5 text-sm text-accent-foreground motion-safe:active:scale-[0.98]"
            >
              View basket
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
