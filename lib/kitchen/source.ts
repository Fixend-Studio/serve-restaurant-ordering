import { getDemoKitchenSource } from "@/lib/demo/kitchen-orders";
import type { DemoKitchenSource, KitchenBoardSource } from "@/lib/kitchen/types";

/**
 * The board asks this module for tickets.
 * Step 6 can return a Supabase Realtime source here when the project is connected.
 * Until then the kitchen runs on the in-memory demo source.
 */
export function getKitchenSource(): KitchenBoardSource {
  return getDemoKitchenSource();
}

export function isDemoKitchenSource(
  source: KitchenBoardSource,
): source is DemoKitchenSource {
  return source.mode === "demo" && "receiveDemoOrder" in source;
}
