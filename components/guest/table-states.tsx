export function TableSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <div className="h-8 w-28 rounded-full bg-line/80" />
      <div className="mt-6 h-8 w-full max-w-md rounded-full bg-line/60" />
      <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-2xl bg-card md:h-72" />
        <div className="h-28 rounded-2xl bg-card md:h-72" />
        <div className="hidden h-72 rounded-2xl bg-card lg:block" />
      </div>
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-10">
      <div className="h-4 w-24 rounded-full bg-line" />
      <div className="mt-4 h-12 w-56 rounded-lg bg-line/80" />
      <div className="mt-8 h-40 rounded-3xl bg-card" />
    </div>
  );
}

export function TableMissing({ tableNumber }: { tableNumber: string }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.22em] text-muted uppercase">Mehr</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">
        Table {tableNumber} is not on the floor.
      </h1>
      <p className="mt-4 text-muted leading-7">
        The QR codes at Mehr cover tables 1 to 12. Ask the floor if this one
        was printed for another room.
      </p>
      <a
        href="/table/4"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-accent-foreground"
      >
        Open table 4
      </a>
    </main>
  );
}
