import type { Metadata } from "next";
import { MenuScreen } from "@/components/guest/menu-screen";

export const metadata: Metadata = {
  title: "Mehr",
};

export default function TablePage() {
  return <MenuScreen />;
}
