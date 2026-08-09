import { z } from "zod";
import { type MixingHistoryFilters, mixingHistoryFiltersSchema } from "@/entities/mixing-job";

export const LIBRARY_TABS = ["profiles", "mixes"] as const;

export const libraryTabSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value) ?? "profiles",
  z.enum(LIBRARY_TABS).catch("profiles"),
);

export const librarySearchParamsSchema = mixingHistoryFiltersSchema.extend({
  tab: libraryTabSchema,
});

export type LibraryTab = (typeof LIBRARY_TABS)[number];
export type LibrarySearchParams = z.infer<typeof librarySearchParamsSchema>;

export function parseLibrarySearchParams(input: Record<string, string | string[] | undefined>) {
  return librarySearchParamsSchema.parse(input);
}

export function mixingHistoryHref(basePath: "/library" | "/mixing-history", filters: MixingHistoryFilters) {
  const search = new URLSearchParams({ page: String(filters.page) });
  if (basePath === "/library") search.set("tab", "mixes");
  if (filters.q) search.set("q", filters.q);
  if (filters.status !== "all") search.set("status", filters.status);
  return `${basePath}?${search}`;
}

export function libraryTabHref(tab: LibraryTab) {
  return tab === "profiles" ? "/library?tab=profiles&page=1" : "/library?tab=mixes&page=1";
}
