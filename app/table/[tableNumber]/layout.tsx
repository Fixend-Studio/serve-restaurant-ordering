import { TableShell } from "@/components/guest/table-shell";
import { restaurant } from "@/lib/demo/menu";

export function generateStaticParams() {
  return restaurant.tables.map((tableNumber) => ({ tableNumber }));
}

export default async function TableLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tableNumber: string }>;
}) {
  const { tableNumber } = await params;
  return <TableShell tableNumber={tableNumber}>{children}</TableShell>;
}
