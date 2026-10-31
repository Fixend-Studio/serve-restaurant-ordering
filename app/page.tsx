import Image from "next/image";
import Link from "next/link";
import { restaurant } from "@/lib/demo/menu";

export default function Home() {
  return (
    <main className="lg:grid lg:min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
      <div className="relative min-h-[62vh] lg:min-h-screen">
        <Image
          src="/menu/hero.jpg"
          alt="The dining room at Mehr"
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 58vw, 100vw"
        />
        <div className="absolute inset-0 bg-[#241c18]/25 lg:bg-[#241c18]/15" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 text-white">
          <p className="text-[11px] tracking-[0.28em] uppercase">Serve</p>
          <p className="text-[11px] tracking-[0.22em] uppercase">FIXEND</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-white lg:hidden">
          <p className="text-[11px] tracking-[0.22em] uppercase text-white/80">
            Clifton, Karachi
          </p>
          <h1 className="mt-2 font-serif text-6xl tracking-tight">{restaurant.name}</h1>
        </div>
      </div>

      <section className="flex flex-col justify-center px-5 py-10 md:px-10 lg:px-14 lg:py-16">
        <p className="hidden text-[11px] tracking-[0.22em] text-muted uppercase lg:block">
          Clifton, Karachi
        </p>
        <h1 className="mt-3 hidden font-serif text-7xl tracking-tight lg:block">
          {restaurant.name}
        </h1>
        <p className="max-w-md text-lg leading-8 text-foreground/85 lg:mt-6">
          {restaurant.summary}
        </p>
        <p className="mt-3 text-sm text-muted">
          {restaurant.neighborhood}
          <span className="px-2 text-line">/</span>
          {restaurant.hours}
        </p>

        <div className="mt-10">
          <p className="text-sm">Your table</p>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:max-w-sm">
            {restaurant.tables.map((table) => (
              <Link
                key={table}
                href={`/table/${table}`}
                className={`flex h-11 items-center justify-center rounded-full text-sm tabular-nums ${
                  table === "4"
                    ? "bg-accent text-accent-foreground"
                    : "bg-[#efe6da] text-foreground"
                }`}
              >
                {table}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Table 4 is highlighted for the demo. Every number opens that table’s menu.
          </p>
        </div>

        <Link
          href="/table/4"
          className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-foreground px-6 text-background"
        >
          Continue to the menu
        </Link>
      </section>
    </main>
  );
}
