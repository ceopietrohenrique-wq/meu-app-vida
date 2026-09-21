export type SavedVerse = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  notes: string | null;
  tags: string[] | null;
  createdAt: string;
};

export type SavedVerseRow = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
};

export function mapSavedVerseRow(row: SavedVerseRow): SavedVerse {
  return {
    id: row.id,
    reference: row.reference,
    book: row.book,
    chapter: row.chapter,
    verseStart: row.verse_start,
    verseEnd: row.verse_end,
    notes: row.notes,
    tags: row.tags,
    createdAt: row.created_at,
  };
}
