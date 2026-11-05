import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getExamConfigById,
  saveExamAttempt,
  evaluateObjectiveQuestion,
  evaluateShortAnswerLocal,
  ExamAttempt,
  AnswerEvaluation,
  TopicPerformance,
  ExamAiFeedback,
} from '@/lib/exam';
import { getAIClientAndModel } from '@/lib/app';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

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
    const userId = session.id;
    const {
      attemptId = uuidv4(),
      examId,
      startedAt,
      userAnswers = body.answers || {},
      reviewStatus = body.reviewFlags || {},
      timeSpentSeconds = 0,
    } = body;

    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 });
    }

    const exam = await getExamConfigById(examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
      return NextResponse.json({ success: false, error: 'Exam not found or has no questions.' }, { status: 404 });
    }

    const now = new Date();
    const startTimeDate = startedAt ? new Date(startedAt) : new Date(Date.now() - timeSpentSeconds * 1000);
    const elapsedSeconds = Math.max(1, Math.round((now.getTime() - startTimeDate.getTime()) / 1000));
    const activeTimeSpent = Math.min(elapsedSeconds, Math.max(timeSpentSeconds, 1));

    // Determine if timer expired
    let status: 'completed' | 'expired' = 'completed';
    if (exam.mode === 'timed' && exam.timeLimitMinutes > 0) {
      const allowedSeconds = exam.timeLimitMinutes * 60 + 30; // 30s network buffer
      if (activeTimeSpent > allowedSeconds) {
        status = 'expired';
      }
    }

    // Evaluate answers
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let negativeMarkingApplied = 0;

    const evaluatedAnswers: AnswerEvaluation[] = [];
    const topicStats: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }> = {};

    exam.questions.forEach((q, idx) => {
      const userAns = userAnswers[q.id] || '';
      const isUnanswered = !userAns || userAns.trim() === '';

      if (!topicStats[q.topic]) {
        topicStats[q.topic] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
      }
      topicStats[q.topic].total += 1;

      if (isUnanswered) {
        unansweredCount++;
        topicStats[q.topic].unanswered += 1;
        evaluatedAnswers.push({
          questionId: q.id,
          questionIndex: idx,
          questionType: q.questionType,
          questionText: q.question,
          userAnswer: '',
          correctAnswer: q.correctAnswer,
          isCorrect: false,
          marksAwarded: 0,
          maxMarks: 1.0,
          feedback: 'Question was left unanswered.',
          explanation: q.explanation,
          topic: q.topic,
          sourceQuote: q.sourceQuote,
          sourceReference: q.sourceReference,
        });
        return;
      }

      if (q.questionType === 'short_answer') {
        const evalRes = evaluateShortAnswerLocal({
          userAnswer: userAns,
          correctAnswer: q.correctAnswer,
          expectedConcepts: q.expectedConcepts,
        });

        if (evalRes.isCorrect) {
          correctCount++;
          topicStats[q.topic].correct += 1;
        } else {
          incorrectCount++;
          topicStats[q.topic].incorrect += 1;
        }
        totalScore += evalRes.marksAwarded;

        evaluatedAnswers.push({
          questionId: q.id,
          questionIndex: idx,
          questionType: q.questionType,
          questionText: q.question,
          userAnswer: userAns,
          correctAnswer: q.correctAnswer,
          isCorrect: evalRes.isCorrect,
          marksAwarded: evalRes.marksAwarded,
          maxMarks: 1.0,
          feedback: evalRes.feedback,
          explanation: q.explanation,
          topic: q.topic,
          sourceQuote: q.sourceQuote,
          sourceReference: q.sourceReference,
        });
      } else {
        // Objective (MCQ & True/False)
        const evalRes = evaluateObjectiveQuestion({
          userAnswer: userAns,
          correctAnswer: q.correctAnswer,
          negativeMarking: exam.negativeMarking,
          negativeMarkValue: exam.negativeMarkValue,
        });

        if (evalRes.isCorrect) {
          correctCount++;
          topicStats[q.topic].correct += 1;
          totalScore += 1.0;
        } else {
          incorrectCount++;
          topicStats[q.topic].incorrect += 1;
          if (exam.negativeMarking) {
            negativeMarkingApplied += exam.negativeMarkValue;
            totalScore += evalRes.marksAwarded; // will be negative penalty
          }
        }

        evaluatedAnswers.push({
          questionId: q.id,
          questionIndex: idx,
          questionType: q.questionType,
          questionText: q.question,
          userAnswer: userAns,
          correctAnswer: q.correctAnswer,
          isCorrect: evalRes.isCorrect,
          marksAwarded: evalRes.marksAwarded,
          maxMarks: 1.0,
          feedback: evalRes.isCorrect ? 'Correct!' : 'Incorrect.',
          explanation: q.explanation,
          topic: q.topic,
          sourceQuote: q.sourceQuote,
          sourceReference: q.sourceReference,
        });
      }
    });

    const maxPossibleScore = exam.questions.length;
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const percentage = Math.round((finalScore / maxPossibleScore) * 100);
    const totalAttempted = correctCount + incorrectCount;
    const accuracyPercentage = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    // Build topic breakdown
    const topicBreakdown: TopicPerformance[] = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      incorrect: stats.incorrect,
      unanswered: stats.unanswered,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }));

    // Generate AI Performance Analysis
    let aiFeedback: ExamAiFeedback = {
      performanceTier:
        percentage >= 85
          ? 'Distinction'
          : percentage >= 70
          ? 'Proficient'
          : percentage >= 50
          ? 'Developing'
          : 'Needs Improvement',
      summary: `You scored ${finalScore} out of ${maxPossibleScore} (${percentage}%). ${
        percentage >= 70 ? 'Strong conceptual grasp demonstrated.' : 'Key areas require targeted review.'
      }`,
      strengths: topicBreakdown.filter((t) => t.percentage >= 70).map((t) => t.topic),
      weakTopics: topicBreakdown.filter((t) => t.percentage < 60).map((t) => t.topic),
      frequentlyMissedConcepts: evaluatedAnswers
        .filter((a) => !a.isCorrect && a.userAnswer)
        .slice(0, 3)
        .map((a) => a.topic),
      recommendations: [
        {
          action: 'Ask AI Study Assistant to clarify your weakest concepts',
          suggestedQuery: `Explain the key concepts of ${topicBreakdown.find((t) => t.percentage < 60)?.topic || exam.title}`,
          relatedDeckId: exam.deckId || undefined,
        },
      ],
    };

    // Attempt Gemini enhanced feedback if key available
    try {
      const aiConfig = getAIClientAndModel();
      if (aiConfig) {
        const missedSummaries = evaluatedAnswers
          .filter((a) => !a.isCorrect)
          .slice(0, 5)
          .map((a) => `Topic: "${a.topic}" | Question: "${a.questionText}" | Correct: "${a.correctAnswer}"`)
          .join('\n');

        if (missedSummaries.length > 20) {
          const completion = await aiConfig.client.chat.completions.create({
            model: aiConfig.model,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert academic tutor analyzing a student exam attempt. Return a JSON object with: { "summary": string, "strengths": string[], "weakTopics": string[], "frequentlyMissedConcepts": string[], "suggestedStudyPlan": string }',
              },
              {
                role: 'user',
                content: `Exam: "${exam.title}" | Score: ${finalScore}/${maxPossibleScore} (${percentage}%) | Time: ${activeTimeSpent}s\n\nMissed Items:\n${missedSummaries}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 600,
          });

          const rawText = completion.choices[0]?.message?.content || '{}';
          const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed.summary) {
            aiFeedback.summary = parsed.summary;
          }
          if (Array.isArray(parsed.strengths) && parsed.strengths.length > 0) {
            aiFeedback.strengths = parsed.strengths;
          }
          if (Array.isArray(parsed.weakTopics) && parsed.weakTopics.length > 0) {
            aiFeedback.weakTopics = parsed.weakTopics;
          }
          if (Array.isArray(parsed.frequentlyMissedConcepts) && parsed.frequentlyMissedConcepts.length > 0) {
            aiFeedback.frequentlyMissedConcepts = parsed.frequentlyMissedConcepts;
          }
        }
      }
    } catch {}

    const attempt: ExamAttempt = {
      id: attemptId,
      examId,
      examTitle: exam.title,
      subjectName: exam.subjectName,
      userId,
      mode: exam.mode,
      startedAt: startTimeDate.toISOString(),
      submittedAt: now.toISOString(),
      timeSpentSeconds: activeTimeSpent,
      timeLimitMinutes: exam.timeLimitMinutes,
      status,
      totalQuestions: exam.questions.length,
      score: finalScore,
      maxPossibleScore,
      percentage,
      accuracyPercentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      negativeMarkingApplied,
      topicBreakdown,
      aiFeedback,
      userAnswers,
      reviewStatus,
      evaluatedAnswers,
      createdAt: now.toISOString(),
    };

    await saveExamAttempt(attempt);

    return NextResponse.json({
      success: true,
      attempt,
      message: 'Exam submitted and evaluated successfully.',
    });
  } catch (error: any) {
    console.error('[API /exam/submit error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error submitting exam.' },
      { status: 500 }
    );
  }
}
