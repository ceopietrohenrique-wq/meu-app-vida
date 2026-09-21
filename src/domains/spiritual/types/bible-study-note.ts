export type BibleStudyNote = {
  id: string;
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  title: string;
  personalInterpretation: string | null;
  context: string | null;
  questions: string | null;
  application: string | null;
  crossReferences: string[] | null;
  tags: string[] | null;
  createdAt: string;
};

export type BibleStudyNoteRow = {
  id: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  title: string;
  personal_interpretation: string | null;
  context: string | null;
  questions: string | null;
  application: string | null;
  cross_references: string[] | null;
  tags: string[] | null;
  created_at: string;
};

export function mapBibleStudyNoteRow(row: BibleStudyNoteRow): BibleStudyNote {
  return {
    id: row.id,
    book: row.book,
    chapter: row.chapter,
    verseStart: row.verse_start,
    verseEnd: row.verse_end,
    title: row.title,
    personalInterpretation: row.personal_interpretation,
    context: row.context,
    questions: row.questions,
    application: row.application,
    crossReferences: row.cross_references,
    tags: row.tags,
    createdAt: row.created_at,
  };
}
