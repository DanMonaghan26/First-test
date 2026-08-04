"use server";

import { requireUser } from "@/lib/auth";
import { searchEvents, type SearchResult } from "@/lib/family-events";

export async function searchEventsAction(query: string): Promise<SearchResult[]> {
  await requireUser();
  return searchEvents(query);
}
