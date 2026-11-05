import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required to migrate study data to cloud account.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { subjects = [], decks = [], tasks = [] } = body;

    let migratedSubjects = 0;
    let migratedDecks = 0;
    let migratedCards = 0;
    let migratedQuestions = 0;
    let migratedTasks = 0;
    const errors: string[] = [];

    // Map legacy subject IDs to new Supabase UUIDs
    const subjectIdMap = new Map<string, string>();

    // 1. Migrate Subjects
    for (const sub of subjects) {
      try {
        if (!sub.name) continue;
        // Check if subject with same name already exists for this user
        const { data: existingSub } = await supabase
          .from('subjects')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', sub.name.trim())
          .maybeSingle();

        if (existingSub) {
          subjectIdMap.set(sub.id, existingSub.id);
        } else {
          const newSubId = uuidv4();
          const { error: insertSubError } = await supabase.from('subjects').insert({
            id: newSubId,
            user_id: user.id,
            name: sub.name.trim(),
            color: sub.colorTag || '#2563EB',
            icon: sub.icon || 'BookOpen',
          });

          if (!insertSubError) {
            subjectIdMap.set(sub.id, newSubId);
            migratedSubjects++;
          } else {
            errors.push(`Subject "${sub.name}": ${insertSubError.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Subject error: ${err?.message}`);
      }
    }

    // 2. Migrate Study Decks, Flashcards, and Quizzes
    for (const deck of decks) {
      try {
        if (!deck.name) continue;

        // Check if deck with identical name already exists
        const { data: existingDeck } = await supabase
          .from('study_decks')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', deck.name.trim())
          .maybeSingle();

        if (existingDeck) {
          // Deck already imported, skip duplicate
          continue;
        }

        const newDeckId = uuidv4();
        const mappedSubjectId = deck.subjectId ? subjectIdMap.get(deck.subjectId) || null : null;

        const { error: insertDeckError } = await supabase.from('study_decks').insert({
          id: newDeckId,
          user_id: user.id,
          subject_id: mappedSubjectId,
          name: deck.name.trim(),
          source_type: deck.sourceType || 'text',
        });

        if (insertDeckError) {
          errors.push(`Deck "${deck.name}": ${insertDeckError.message}`);
          continue;
        }

        migratedDecks++;

        // 2a. Insert Flashcards
        if (Array.isArray(deck.flashcards) && deck.flashcards.length > 0) {
          const flashcardRows = deck.flashcards.map((fc: any) => ({
            id: uuidv4(),
            deck_id: newDeckId,
            user_id: user.id,
            question: fc.question,
            answer: fc.answer,
            topic: fc.topic || 'General',
            concept_tested: fc.topic,
            source_quote: fc.sourceQuote || null,
            source_reference: fc.sourceReference || null,
            difficulty: fc.difficulty || null,
            interval_days: fc.intervalDays || 0,
            next_review_date: fc.nextReviewDate || new Date().toISOString().split('T')[0],
            times_reviewed: fc.timesReviewed || 0,
            times_incorrect: fc.timesIncorrect || 0,
            mastery_level: fc.masteryLevel || 'new',
            is_bookmarked: Boolean(fc.isBookmarked),
          }));

          const { error: fcInsertError } = await supabase.from('flashcards').insert(flashcardRows);
          if (!fcInsertError) {
            migratedCards += flashcardRows.length;
          } else {
            errors.push(`Flashcards in "${deck.name}": ${fcInsertError.message}`);
          }
        }

        // 2b. Insert Quiz and Questions
        if (Array.isArray(deck.quizQuestions) && deck.quizQuestions.length > 0) {
          const newQuizId = uuidv4();
          await supabase.from('quizzes').insert({
            id: newQuizId,
            deck_id: newDeckId,
            user_id: user.id,
            title: `${deck.name.trim()} Quiz`,
            total_questions: deck.quizQuestions.length,
          });

          const questionRows = deck.quizQuestions.map((q: any) => ({
            id: uuidv4(),
            quiz_id: newQuizId,
            user_id: user.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correctAnswer,
            explanation: q.explanation || 'Verified from study notes.',
            topic: q.topic || 'General',
            source_quote: q.sourceQuote || null,
            source_reference: q.sourceReference || null,
          }));

          const { error: qInsertError } = await supabase.from('quiz_questions').insert(questionRows);
          if (!qInsertError) {
            migratedQuestions += questionRows.length;
          } else {
            errors.push(`Quiz questions in "${deck.name}": ${qInsertError.message}`);
          }
        }
      } catch (deckErr: any) {
        errors.push(`Deck error: ${deckErr?.message}`);
      }
    }

    // 3. Migrate Planner Tasks
    for (const task of tasks) {
      try {
        if (!task.title || !task.date) continue;
        const mappedSubjectId = task.subjectId ? subjectIdMap.get(task.subjectId) || null : null;

        const { error: taskError } = await supabase.from('planner_tasks').insert({
          id: uuidv4(),
          user_id: user.id,
          subject_id: mappedSubjectId,
          title: task.title.trim(),
          notes: task.notes || null,
          due_date: task.date,
          completed: Boolean(task.completed),
        });

        if (!taskError) {
          migratedTasks++;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      migrated: {
        subjects: migratedSubjects,
        decks: migratedDecks,
        flashcards: migratedCards,
        quizQuestions: migratedQuestions,
        plannerTasks: migratedTasks,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error migrating study data.' },
      { status: 500 }
    );
  }
}
