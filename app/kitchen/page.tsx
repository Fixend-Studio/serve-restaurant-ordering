import type { Metadata } from "next";
import { KitchenBoard } from "@/components/kitchen/kitchen-board";

export const metadata: Metadata = {
  title: "Kitchen",
  description: "Kitchen display for Mehr. Demo tickets stay on this screen.",
};

export default function KitchenPage() {
  return <KitchenBoard />;
}
