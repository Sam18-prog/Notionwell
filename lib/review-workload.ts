/**
 * Client-safe Review Workload & SM-2 Schedule Calculator
 * Safe to import in browser client components without Node.js dependencies
 */

import { Deck, Subject } from './app';

export interface ReviewWorkloadItem {
  deckId: string;
  deckName: string;
  subjectId?: string | null;
  subjectName?: string;
  dueTodayCount: number;
  overdueCount: number;
  totalDueCount: number;
  estimatedMinutes: number;
}

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateReviewWorkload(
  decks: Deck[],
  subjects: Subject[]
): {
  dueTodayCount: number;
  overdueCount: number;
  upcoming7DaysCount: number;
  difficultCardsCount: number;
  masteredCardsCount: number;
  deckWorkload: ReviewWorkloadItem[];
  next14DaysSchedule: Array<{ date: string; dayLabel: string; count: number }>;
} {
  const todayStr = getLocalDateString();
  let dueTodayCount = 0;
  let overdueCount = 0;
  let difficultCardsCount = 0;
  let masteredCardsCount = 0;

  const deckMap: Record<string, ReviewWorkloadItem> = {};
  const dateCounts: Record<string, number> = {};

  // Initialize next 14 days
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dStr = getLocalDateString(d);
    dateCounts[dStr] = 0;
  }

  for (const deck of decks) {
    const subject = subjects.find((s) => s.id === deck.subjectId);
    if (!deckMap[deck.id]) {
      deckMap[deck.id] = {
        deckId: deck.id,
        deckName: deck.name,
        subjectId: deck.subjectId,
        subjectName: subject?.name,
        dueTodayCount: 0,
        overdueCount: 0,
        totalDueCount: 0,
        estimatedMinutes: 0,
      };
    }

    for (const card of deck.flashcards) {
      if (card.masteryLevel === 'mastered') {
        masteredCardsCount += 1;
      }
      if ((card.timesIncorrect || 0) >= 2) {
        difficultCardsCount += 1;
      }

      const cardReviewDate = card.nextReviewDate || todayStr;
      if (cardReviewDate < todayStr) {
        overdueCount += 1;
        deckMap[deck.id].overdueCount += 1;
        deckMap[deck.id].totalDueCount += 1;
      } else if (cardReviewDate === todayStr) {
        dueTodayCount += 1;
        deckMap[deck.id].dueTodayCount += 1;
        deckMap[deck.id].totalDueCount += 1;
      }

      // Schedule calendar distribution
      if (dateCounts[cardReviewDate] !== undefined) {
        dateCounts[cardReviewDate] += 1;
      }
    }

    // Estimate ~35 seconds per card
    deckMap[deck.id].estimatedMinutes = Math.max(
      1,
      Math.round((deckMap[deck.id].totalDueCount * 35) / 60)
    );
  }

  // Count upcoming in next 7 days
  let upcoming7DaysCount = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dStr = getLocalDateString(d);
    upcoming7DaysCount += dateCounts[dStr] || 0;
  }

  const next14DaysSchedule = Object.entries(dateCounts).map(([dateStr, count]) => {
    const dObj = new Date(dateStr + 'T00:00:00');
    const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { date: dateStr, dayLabel, count };
  });

  return {
    dueTodayCount,
    overdueCount,
    upcoming7DaysCount,
    difficultCardsCount,
    masteredCardsCount,
    deckWorkload: Object.values(deckMap).filter((dw) => dw.totalDueCount > 0),
    next14DaysSchedule,
  };
}
