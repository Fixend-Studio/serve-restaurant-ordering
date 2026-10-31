"use client";

import { Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function QuantityControl({
  value,
  onChange,
  label,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[#efe6da] p-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex size-10 items-center justify-center rounded-full text-foreground motion-safe:active:scale-95 disabled:opacity-35"
      >
        <Minus className="size-4" />
      </button>
      <motion.span
        key={value}
        initial={reduce ? false : { opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="w-7 text-center text-sm tabular-nums"
      >
        {value}
      </motion.span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex size-10 items-center justify-center rounded-full text-foreground motion-safe:active:scale-95 disabled:opacity-35"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
