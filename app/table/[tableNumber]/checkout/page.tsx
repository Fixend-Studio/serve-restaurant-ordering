import type { Metadata } from "next";
import { CheckoutScreen } from "@/components/guest/checkout-screen";

export const metadata: Metadata = {
  title: "Your order",
};

export default function CheckoutPage() {
  return <CheckoutScreen />;
}
