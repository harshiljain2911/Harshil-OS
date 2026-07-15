import { useQuery } from "@tanstack/react-query";
import { listCollection, getItem, getSite } from "./api";

export const useCollection = (name) =>
  useQuery({ queryKey: ["collection", name], queryFn: () => listCollection(name) });

export const useItem = (name, slug) =>
  useQuery({
    queryKey: ["item", name, slug],
    queryFn: () => getItem(name, slug),
    enabled: !!slug,
  });

// Site-wide singleton: identity, hero, about, contact, social, SEO, nav, etc.
// Single source of truth — see backend/content/site.json.
export const useSite = () =>
  useQuery({ queryKey: ["site"], queryFn: getSite, staleTime: Infinity });
