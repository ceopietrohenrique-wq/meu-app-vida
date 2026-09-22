export type GlobalSearchResultType =
  "task" | "customer" | "bible_study_note" | "catalog_item";

export type GlobalSearchResult = {
  type: GlobalSearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};
