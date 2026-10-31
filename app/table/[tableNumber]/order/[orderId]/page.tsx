import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationScreen } from "@/components/guest/confirmation-screen";
import { OrderSkeleton } from "@/components/guest/table-states";

export const metadata: Metadata = {
  title: "Order sent",
};

export default function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <Confirmed params={params} />
    </Suspense>
  );
}

async function Confirmed({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <ConfirmationScreen orderId={orderId} />;
}
