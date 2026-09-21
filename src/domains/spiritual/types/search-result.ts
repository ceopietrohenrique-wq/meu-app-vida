export type SpiritualSearchResultType = "bible_study_note" | "saved_verse";

export type SpiritualSearchResult = {
  id: string;
  type: SpiritualSearchResultType;
  title: string;
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  tags: string[] | null;
  createdAt: string;
};
