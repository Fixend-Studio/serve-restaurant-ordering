"use client";

import { Button } from "@/components/ui/button";

export default function TableError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-4xl tracking-tight">
        The menu did not load.
      </h1>
      <p className="mt-4 text-muted leading-7">
        Stay at the table and try again. If it keeps failing, ask someone from
        the floor.
      </p>
      <Button type="button" className="mt-8 w-fit" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
