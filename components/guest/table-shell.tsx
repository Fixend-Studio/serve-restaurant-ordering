"use client";

import { GuestSession } from "@/components/guest/guest-session";
import { TableMissing, TableSkeleton } from "@/components/guest/table-states";
import { getTable } from "@/lib/demo/menu";

export function TableShell({
  tableNumber,
  children,
}: {
  tableNumber: string;
  children: React.ReactNode;
}) {
  if (!tableNumber) {
    return <TableSkeleton />;
  }

  const table = getTable(tableNumber);
  if (!table) {
    return <TableMissing tableNumber={tableNumber} />;
  }

  return <GuestSession tableNumber={table.number}>{children}</GuestSession>;
}
