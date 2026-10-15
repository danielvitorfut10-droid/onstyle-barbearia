import { queryOptions } from "@tanstack/react-query";
import { getSiteData } from "./public.functions";

export const siteQueryOptions = queryOptions({
  queryKey: ["site-data"],
  queryFn: () => getSiteData(),
  staleTime: 5 * 60 * 1000,
});

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;
export type SiteBarber = SiteData["barbers"][number];
export type SiteService = SiteData["services"][number];
