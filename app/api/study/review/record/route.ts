import { NextRequest, NextResponse } from 'next/server';
import {
  calculateSM2,
  recordFlashcardReview,
  awardXP,
  recordActiveStudyDate,
  SM2Rating,
} from '@/lib/analytics';
import { getDeckById, saveDeck, Flashcard } from '@/lib/app';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// In-memory debounce map to prevent rapid duplicate double-clicks
const recentReviews = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      deckId,
      cardId,
      response,
      rating,
      durationMs = 0,
      responseTimeMs = 0,
      card: clientCard,
    } = body;

    if (!deckId || typeof deckId !== 'string' || !cardId || typeof cardId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid deckId and cardId strings are required.' },
        { status: 400 }
      );
    }

    const rawResponse = response || rating || 'good';
    const validRatings = ['again', 'hard', 'good', 'easy', 'medium'];
    if (!validRatings.includes(rawResponse)) {
      return NextResponse.json(
        { success: false, error: `Invalid rating. Allowed ratings: ${validRatings.join(', ')}` },
        { status: 400 }
      );
    }

    const userId = session.id;

    // Debounce check: reject repeated clicks on same card within 800ms
    const debounceKey = `${userId}:${cardId}`;
    const now = Date.now();
    const lastReviewedAt = recentReviews.get(debounceKey);
    if (lastReviewedAt && now - lastReviewedAt < 800) {
      return NextResponse.json(
        { success: false, error: 'Duplicate review submission rejected (too rapid).' },
        { status: 429 }
      );
    }
    recentReviews.set(debounceKey, now);

    // Prune debounce map to prevent memory leak
    if (recentReviews.size > 2000) {
      const cutoff = now - 5000;
      for (const [k, time] of recentReviews.entries()) {
        if (time < cutoff) recentReviews.delete(k);
      }
    }

    const chosenResponse: SM2Rating = rawResponse as SM2Rating;
    const chosenDuration = durationMs || responseTimeMs || 0;

    // Attempt to load from storage or construct fallback representation
    let deck = getDeckById(deckId);
    let currentCard: Flashcard;

    if (deck) {
      const cardIndex = deck.flashcards.findIndex((c) => c.id === cardId);
      if (cardIndex !== -1) {
        currentCard = deck.flashcards[cardIndex];
      } else {
        currentCard = clientCard || {
          id: cardId,
          deckId: deckId,
          question: 'Review Card',
          answer: '',
          intervalDays: 0,
          nextReviewDate: new Date().toISOString().split('T')[0],
          timesReviewed: 0,
          timesIncorrect: 0,
        };
      }
    } else {
      currentCard = clientCard || {
        id: cardId,
        deckId: deckId,
        question: 'Review Card',
        answer: '',
        intervalDays: 0,
        nextReviewDate: new Date().toISOString().split('T')[0],
        timesReviewed: 0,
        timesIncorrect: 0,
      };
    }

    const sm2Result = calculateSM2(currentCard, chosenResponse);

    const updatedCard: Flashcard = {
      ...currentCard,
      intervalDays: sm2Result.intervalDays,
      nextReviewDate: sm2Result.nextReviewDate,
      timesReviewed: (currentCard.timesReviewed || 0) + 1,
      timesIncorrect:
        chosenResponse === 'again'
          ? (currentCard.timesIncorrect || 0) + 1
          : currentCard.timesIncorrect || 0,
      masteryLevel: sm2Result.masteryLevel,
      lastReviewedDate: new Date().toISOString(),
      difficulty:
        chosenResponse === 'again' || chosenResponse === 'hard'
          ? 'hard'
          : chosenResponse === 'easy'
          ? 'easy'
          : 'medium',
    };

    (updatedCard as any).easinessFactor = sm2Result.easinessFactor;
    (updatedCard as any).repetitionCount = sm2Result.repetitionCount;

    if (deck) {
      const cIdx = deck.flashcards.findIndex((c) => c.id === cardId);
      if (cIdx !== -1) {
        deck.flashcards[cIdx] = updatedCard;
        saveDeck(deck);
      }
    }

    // Record review log in analytics persistence & Supabase
    const reviewLog = recordFlashcardReview(
      userId,
      deckId,
      cardId,
      chosenResponse,
      sm2Result,
      chosenDuration
    );

    // Record streak active date
    recordActiveStudyDate(userId, 'flashcard', Math.round(chosenDuration / 1000), 1);

    // Award XP: again = 5, hard = 8, good = 10, easy = 15
    const xpAmount =
      chosenResponse === 'again'
        ? 5
        : chosenResponse === 'hard'
        ? 8
        : chosenResponse === 'easy'
        ? 15
        : 10;

    const xpResult = awardXP(
      userId,
      'flashcard_review',
      xpAmount,
      `Reviewed flashcard in "${deck?.name || 'Deck'}"`,
      `review-${reviewLog.id}`
    );

    return NextResponse.json({
      success: true,
      userId,
      card: updatedCard,
      sm2Result,
      xpResult,
      xpEarned: xpAmount,
      review: reviewLog,
      message: 'Flashcard review recorded and SM-2 scheduled.',
    });
  } catch (error: any) {
    console.error('[API /study/review/record error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to record flashcard review.' },
      { status: 500 }
    );
  }
}
