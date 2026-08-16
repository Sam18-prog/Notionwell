import { Deck } from './app';

/**
 * Converts a deck's flashcards into a clean Anki-compatible CSV format.
 * Columns: Front, Back, Tags
 */
export function convertDeckToAnkiCSV(deck: Deck): string {
  const headers = ['Front', 'Back', 'Tags'];
  
  const rows = deck.flashcards.map((card) => {
    // Escape quotes and linebreaks for CSV formatting
    const front = `"${(card.question || '').replace(/"/g, '""')}"`;
    const back = `"${(card.answer || '').replace(/"/g, '""')}"`;
    const tag = `"${(card.topic || deck.name || 'Notionwell').replace(/\s+/g, '_').replace(/"/g, '""')}"`;
    return `${front},${back},${tag}`;
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a client-side browser file download for a CSV file.
 */
export function downloadDeckAsCSV(deck: Deck): void {
  if (typeof window === 'undefined') return;

  const csvContent = convertDeckToAnkiCSV(deck);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const safeFileName = (deck.name || 'study-deck').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${safeFileName}_anki_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
