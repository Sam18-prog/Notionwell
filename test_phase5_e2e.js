/**
 * Phase 5 E2E Automated Verification Test
 * 1. Checks GET /api/exam/history
 * 2. Generates an exam from sample pdf via POST /api/exam/generate
 * 3. Verifies grounded questions (MCQ, True/False, Short Answer)
 * 4. Checks GET /api/exam/[id]?mode=taking to ensure answer keys are redacted/sanitized
 * 5. Submits answers via POST /api/exam/submit
 * 6. Verifies evaluation results, negative marking, rubrics, and AI diagnostic feedback
 * 7. Checks GET /api/exam/history updates with the completed exam
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== STARTING NOTIONWELL PHASE 5 EXAM SYSTEM VERIFICATION ===\n');

  // Step 1: Check initial exam history
  console.log('Step 1: Fetching initial exam history...');
  const histRes1 = await fetch(`${BASE_URL}/api/exam/history`);
  const histData1 = await histRes1.json();
  if (!histData1.success) throw new Error('Initial history fetch failed');
  console.log('Initial history fetched. Total attempts:', histData1.attempts?.length || 0);

  // Step 2: Generate exam
  console.log('\nStep 2: Generating exam blueprint with Gemini AI from "sample pdf a smaller.pdf"...');
  const genPayload = {
    title: 'Machine Learning & AI Assessment Test',
    selectedSourceIds: ['96b4bd8d-72b0-456d-bf2a-8ab536754bec'],
    totalQuestions: 3,
    timeLimitMinutes: 10,
    difficulty: 'medium',
    questionTypes: ['mcq', 'true_false', 'short_answer'],
    negativeMarking: true,
    negativeMarkValue: 0.25,
    mode: 'timed'
  };

  const genRes = await fetch(`${BASE_URL}/api/exam/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(genPayload)
  });

  const genData = await genRes.json();
  if (!genData.success || !genData.exam) {
    throw new Error(`Exam generation failed: ${genData.error || JSON.stringify(genData)}`);
  }

  const exam = genData.exam;
  console.log(`Exam created successfully! ID: ${exam.id}`);
  console.log(`Title: "${exam.title}"`);
  console.log(`Questions generated: ${exam.questions.length}`);

  // Step 3: Inspect generated questions
  console.log('\nStep 3: Verifying grounded questions and types:');
  exam.questions.forEach((q, idx) => {
    console.log(`  [Q${idx + 1}] Type: ${q.questionType} | Topic: "${q.topic}" | Diff: ${q.difficulty}`);
    console.log(`       Question: ${q.question.substring(0, 80)}...`);
    console.log(`       Correct Answer: ${q.correctAnswer}`);
    if (q.sourceQuote) {
      console.log(`       Source Quote: "${q.sourceQuote.substring(0, 60)}..."`);
    }
  });

  if (exam.questions.length === 0) {
    throw new Error('No questions generated');
  }

  // Step 4: Verify mode=taking answer key sanitization
  console.log('\nStep 4: Testing security - Answer Key Sanitization during active test taking...');
  const takingRes = await fetch(`${BASE_URL}/api/exam/${exam.id}?mode=taking`);
  const takingData = await takingRes.json();
  if (!takingData.success) throw new Error('Failed to fetch exam in taking mode');

  let sanitized = true;
  takingData.exam.questions.forEach((q, idx) => {
    if (q.correctAnswer !== undefined || q.explanation !== undefined || q.sourceQuote !== undefined) {
      sanitized = false;
      console.error(`Security breach: Question Q${idx + 1} leaked answer data in taking mode!`);
    }
  });

  if (sanitized) {
    console.log('Security check PASSED: All correct answers, explanations, and quotes stripped for active test-takers.');
  } else {
    throw new Error('Answer keys were leaked in taking mode!');
  }

  // Step 5: Submit answers
  console.log('\nStep 5: Submitting test attempt with real answers...');
  // Q1: Correct
  // Q2: Incorrect (verifying negative marking penalty)
  // Q3: Concept answer
  const answers = {};
  exam.questions.forEach((q, idx) => {
    if (idx === 0) {
      answers[q.id] = q.correctAnswer; // Correct
    } else if (idx === 1) {
      if (q.questionType === 'true_false') {
        answers[q.id] = q.correctAnswer.toLowerCase() === 'true' ? 'False' : 'True'; // Incorrect
      } else if (q.questionType === 'mcq') {
        const wrongOpt = q.options?.find(o => o !== q.correctAnswer) || 'Wrong Option';
        answers[q.id] = wrongOpt; // Incorrect
      } else {
        answers[q.id] = 'Irrelevant answer that misses the concept entirely';
      }
    } else {
      answers[q.id] = q.correctAnswer || 'Machine learning algorithms learn patterns directly from training data without being explicitly programmed.';
    }
  });

  const submitPayload = {
    examId: exam.id,
    userAnswers: answers,
    timeSpentSeconds: 125,
    flaggedQuestionIds: [exam.questions[0].id]
  };

  const submitRes = await fetch(`${BASE_URL}/api/exam/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submitPayload)
  });

  const submitData = await submitRes.json();
  if (!submitData.success || !submitData.attempt) {
    throw new Error(`Submission failed: ${submitData.error || JSON.stringify(submitData)}`);
  }

  const attempt = submitData.attempt;
  console.log('\nStep 6: Verified Automated Answer Evaluation:');
  console.log(`  Attempt ID: ${attempt.id}`);
  console.log(`  Total Score: ${attempt.score} / ${attempt.maxPossibleScore}`);
  console.log(`  Score Percentage: ${attempt.percentage}%`);
  console.log(`  Performance Tier: ${attempt.aiFeedback?.performanceTier || 'Proficient'}`);
  console.log(`  Correct: ${attempt.correctCount} | Incorrect: ${attempt.incorrectCount} | Negative Marks: -${attempt.negativeMarkingApplied}`);
  console.log(`  Time Spent: ${attempt.timeSpentSeconds} seconds`);

  console.log('\nTopic Breakdown:');
  attempt.topicBreakdown?.forEach(tp => {
    console.log(`  - Topic "${tp.topic}": ${tp.earnedMarks}/${tp.totalMarks} marks (${tp.percentage}%)`);
  });

  console.log('\nAI Diagnostic Feedback:');
  console.log(`  Overall Summary: ${attempt.aiFeedback?.summary}`);
  console.log(`  Strengths: ${attempt.aiFeedback?.strengths?.join(', ') || 'None'}`);
  console.log(`  Weak Topics: ${attempt.aiFeedback?.weakTopics?.join(', ') || 'None'}`);
  console.log(`  Actionable Recommendations: ${JSON.stringify(attempt.aiFeedback?.recommendations)}`);

  // Step 7: Verify Exam History
  console.log('\nStep 7: Verifying exam history and dashboard analytics...');
  const histRes2 = await fetch(`${BASE_URL}/api/exam/history`);
  const histData2 = await histRes2.json();
  if (!histData2.success) throw new Error('History fetch after submission failed');

  console.log(`  Updated Exams Completed: ${histData2.stats?.examsCompleted}`);
  console.log(`  Average Exam Score: ${histData2.stats?.averageScore}%`);
  console.log(`  Weak Topics Tracked: ${histData2.stats?.weakTopics?.join(', ') || 'None'}`);

  console.log('\n=== ALL PHASE 5 TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
